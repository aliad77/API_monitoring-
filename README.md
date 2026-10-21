# Pulse

Pulse is a full-stack API and uptime monitoring app. You register HTTP endpoints, a background worker checks them on a schedule, and the app records every result. From those results it shows response-time history, sampled uptime and incident timelines, and it can publish public status pages.

I built it as a portfolio project to practise the parts of a real product that are easy to get wrong: running background jobs safely across several workers, handling concurrent state changes, making outbound requests to user-supplied URLs without opening an SSRF hole, and enforcing per-user data ownership.

> **Project status:** the features below are implemented and covered by automated tests, which run in GitHub Actions against a real PostgreSQL database. The application itself has not yet been run end-to-end in a browser, built for production, or deployed. See [Project status and verification](#project-status-and-verification).

## Features

- **Accounts:** email/password registration and sign-in (Auth.js), profile and password settings, and account deletion.
- **Monitors:** create, edit, pause, resume and delete. Each monitor has a GET or HEAD method, an expected status code, an interval (1/5/10/30 min) and a timeout (5–30 s).
- **Real HTTP checks:** a separate worker process claims due monitors from PostgreSQL, makes the requests and records status code, response time and failure reason.
- **Incidents:** an incident opens on the first failed check and resolves on the next success. The system guarantees at most one open incident per monitor.
- **Notifications:** an in-app notification when an incident opens or resolves, with read/unread state.
- **Dashboard:** monitor counts by status, average response time, recent incidents and recent checks. Every figure comes from stored data.
- **Monitor detail:** response-time chart, sampled uptime for 24 h / 7 d / 30 d, paginated check history and incident history.
- **Public status pages:** you choose which monitors appear. Visitors see each service's name, status, 30-day daily uptime bars and incident times, but never its URL or settings.
- **UI:** light and dark mode, responsive layout, keyboard focus states, labelled form fields with inline errors, and loading, empty and error states.

## Screenshots

No screenshots yet. I'll add real screenshots of the running application once it has been run locally. The repository contains no mock-ups presented as screenshots.

## Design

Pulse has its own visual identity: Y2K-inspired chrome and glossy glass panels, a lavender, candy, aqua and acid-lime palette on purple-tinted neutrals, a pixel font for labels and badges, and original pixel sprites (including Pip, a small CRT mascot). The data-heavy screens use a calmer version of the same system, so tables, forms and charts stay readable.

The landing page is a scroll-driven 3D sequence: a chrome monitoring station that turns towards the viewer, a fly-through of the five steps of a check, and a dashboard that rotates up off the page. Implementation notes:

- **CSS 3D only.** The station is built from real six-faced CSS boxes (`perspective` and `transform-style: preserve-3d`), with no WebGL and no animation library. Nothing added to the dependency list.
- **One scroll listener.** `components/landing/scroll-stage.tsx` reads each scene's position once per animation frame and writes a `--p` progress value (and a step number) to it. All motion is CSS reading that value, so scrolling never re-renders React, and only `transform` and `opacity` are animated.
- **Reduced motion.** Every scene has a complete static layout; the motion is added only under `prefers-reduced-motion: no-preference`.
- **Mobile.** Smaller station, fewer decorative objects, no orbiting sprites, and the hero and dashboard scroll normally instead of pinning.
- **Honest illustrations.** Every illustrative panel on the landing page is labelled as sample data and uses `example.com` hosts.

## Tech stack

| Area       | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | Next.js 15 (App Router), React 19, TypeScript            |
| Styling    | Tailwind CSS 4, CSS 3D transforms, Lucide icons, Recharts |
| Database   | PostgreSQL 16, Prisma ORM                                |
| Auth       | Auth.js v5 (credentials provider, JWT sessions), bcrypt  |
| Validation | Zod                                                      |
| Monitoring | Standalone Node.js worker using `node:http`/`node:https` |
| Testing    | Vitest, React Testing Library                            |
| Tooling    | ESLint, Prettier, Docker Compose, GitHub Actions         |

## Architecture

```mermaid
flowchart LR
  Browser -->|pages, server actions| Web[Next.js app]
  Browser -->|REST /api/*| Web
  Visitor[Public visitor] -->|/status/:slug| Web
  Web -->|Prisma| DB[(PostgreSQL)]
  Worker[Monitoring worker] -->|claim due monitors\nrecord results| DB
  Worker -->|validated, pinned HTTP request| Target[Monitored endpoints]
```

- `app/`: routes. `(auth)` holds sign-in and registration, `(dashboard)` the signed-in pages, `status/[slug]` the public status page, and `api/` the REST route handlers.
- `lib/data/`: ownership-scoped database queries, shared by pages and API routes.
- `lib/monitoring/`: URL policy, HTTP check, pinned transport, job claiming and result recording.
- `worker/index.ts`: the polling loop. It never runs inside the web process.
- `components/`: UI primitives (`ui/`) and feature components.

### Database

```mermaid
erDiagram
  User ||--o{ Monitor : owns
  User ||--o{ Notification : receives
  User ||--o{ StatusPage : owns
  Monitor ||--o{ Check : has
  Monitor ||--o{ Incident : has
  Incident ||--o{ Notification : triggers
  StatusPage ||--o{ StatusPageMonitor : lists
  Monitor ||--o{ StatusPageMonitor : "appears on"
```

- Every foreign key cascades on delete, so deleting a user or monitor removes all of its data.
- Indexes: `Monitor(isActive, nextCheckAt)` for scheduling, `Check(monitorId, checkedAt)` for history and charts, `Check(checkedAt)` for retention pruning, and `Incident(monitorId, startedAt)`.
- A hand-written **partial unique index** allows only one unresolved incident per monitor.
- All timestamps are `timestamptz`.

## Monitoring lifecycle

```mermaid
sequenceDiagram
  participant W as Worker
  participant DB as PostgreSQL
  participant T as Target
  W->>DB: UPDATE … FOR UPDATE SKIP LOCKED (claim due monitors, set lease)
  W->>W: validate URL, resolve DNS, reject private addresses
  W->>T: HTTP request pinned to the validated IP
  T-->>W: status line + headers (body is not read)
  W->>DB: BEGIN; lock monitor row WHERE leaseToken matches
  alt lease still held
    W->>DB: insert Check, open/resolve Incident + Notification,<br/>update status, schedule nextCheckAt, clear lease
  else lease lost (edited, paused, deleted, re-claimed)
    W->>DB: discard result
  end
  W->>DB: COMMIT
```

### Key engineering decisions

These are covered in more depth in [docs/engineering-decisions.md](docs/engineering-decisions.md).

1. **Scheduling:** each monitor stores `nextCheckAt`. The worker polls every 5 s (configurable) and claims up to 10 due monitors at a time. After a check, `nextCheckAt = checkedAt + interval`.
2. **Duplicate-job prevention:** claims use `FOR UPDATE SKIP LOCKED` plus a 120 s lease, so two workers never claim the same monitor at once. A crashed worker's monitors become claimable again when the lease expires.
3. **HTTP checks:** a single overall timeout (via `AbortController`) covers DNS and every redirect hop. A check passes only if the final status equals the expected status. Redirects are followed manually (up to 5), except when the monitor expects a 3xx.
4. **Incident transitions:** results are recorded in one transaction that locks the monitor row and requires the lease token to match. Incidents follow whether an open incident row exists, which a partial unique index backs up. This prevents duplicate incidents and stops stale results from overwriting newer state.
5. **Private network access:** see [Security](#security).
6. **Uptime:** `successful checks ÷ total checks` in the period, computed from stored checks. It is a sample, not continuous availability: outages shorter than the interval can be missed, and the UI says so.
7. **Authentication and ownership:** the user id comes only from the signed session. Every private query filters by `userId`. Another user's resource returns 404.

## Security

- **SSRF:** the worker allows only http/https URLs and rejects URLs with embedded credentials. It also rejects localhost, `.local`, `.internal` and single-label hostnames. Before connecting, it resolves DNS and rejects the host if _any_ address is private, loopback, link-local, CGNAT, multicast or reserved. IPv6 is limited to global unicast. The connection is then pinned to the validated IPs through a custom `lookup` to defeat DNS rebinding, while still letting Node fall back from IPv6 to IPv4. Every redirect hop goes through the same checks, and the response body is never downloaded.
- **No credential leakage:** checks use a fresh connection with only `User-Agent` and `Accept` headers. The web app never makes outbound requests to user URLs.
- **Limits:** each user can have at most 25 monitors and 5 status pages. User-triggered checks must be at least 30 s apart, and intervals and timeouts come from fixed lists.
- **Auth:** passwords are hashed with bcrypt. JWT sessions are signed with `AUTH_SECRET`. Server-side checks run on every page and API route, and they also confirm the account still exists, so a deleted account's token stops working immediately.
- **Headers:** responses set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict referrer policy and a restrictive permissions policy.
- **Public pages:** public status pages select only display fields. A test checks that URLs, ids and failure messages don't appear in the public data.
- **Errors:** API errors return `{ error, fieldErrors? }` with no stack traces or internals.

## API overview

All endpoints except Auth.js's own require a session cookie. They return JSON and report errors as `{ "error": string, "fieldErrors"?: Record<string, string> }`.

| Method               | Path                                                             | Description                                             |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| GET                  | `/api/monitors`                                                  | List your monitors                                      |
| POST                 | `/api/monitors`                                                  | Create a monitor (201, 422 on validation, 403 at limit) |
| GET                  | `/api/monitors/:id`                                              | Get one monitor                                         |
| PATCH                | `/api/monitors/:id`                                              | Update fields, or `{ "isActive": false }` to pause      |
| DELETE               | `/api/monitors/:id`                                              | Delete monitor and its history (204)                    |
| POST                 | `/api/monitors/:id/check`                                        | Schedule a check as soon as allowed (202)               |
| GET                  | `/api/monitors/:id/checks?cursor=&limit=`                        | Paginated check history, newest first                   |
| GET                  | `/api/incidents?status=open\|resolved&monitorId=&cursor=&limit=` | Paginated incidents                                     |
| GET                  | `/api/notifications`                                             | Latest 50 notifications and unread count                |
| PATCH                | `/api/notifications/:id`                                         | `{ "read": boolean }`                                   |
| POST                 | `/api/notifications/read-all`                                    | Mark all as read                                        |
| GET / POST           | `/api/status-pages`                                              | List / create status pages                              |
| GET / PATCH / DELETE | `/api/status-pages/:id`                                          | Manage one status page                                  |

Sign-in, registration and account settings use Server Actions, because they are tied to Auth.js's session handling.

## Local setup

Prerequisites: Node.js 22.9+ (the worker script uses `--env-file-if-exists`), Docker.

```bash
git clone https://github.com/aliad77/API_monitoring-.git pulse
cd pulse
cp .env.example .env
# Set AUTH_SECRET in .env, e.g. to the output of: openssl rand -base64 32

docker compose up -d          # PostgreSQL on :5432 (also creates pulse_test)
npm ci                        # installs from package-lock.json; also runs `prisma generate`
npm run db:deploy             # apply migrations
npm run db:seed               # optional demo account (see below)

npm run dev                   # web app on http://localhost:3000
npm run worker                # in a second terminal: runs the checks
```

Without the worker, monitors stay in the _Pending_ state, because the web app never performs checks itself.

### Demo data

`npm run db:seed` creates a clearly labelled demo account (`demo@example.com`, password from `SEED_DEMO_PASSWORD`). It adds three `[Demo]` monitors that point at real public URLs, one of them deliberately failing, plus a status page at `/status/demo`. The seed **does not insert any check results**: every number you see comes from checks the worker actually performs. It refuses to run when `NODE_ENV=production`.

### Environment variables

| Variable                  | Required              | Purpose                                |
| ------------------------- | --------------------- | -------------------------------------- |
| `DATABASE_URL`            | yes                   | PostgreSQL connection string           |
| `AUTH_SECRET`             | yes                   | Signs session tokens                   |
| `AUTH_TRUST_HOST`         | when self-hosting     | Lets Auth.js trust the request host    |
| `TEST_DATABASE_URL`       | for integration tests | Separate test database                 |
| `SEED_DEMO_PASSWORD`      | no                    | Demo account password                  |
| `WORKER_BATCH_SIZE`       | no                    | Monitors claimed per poll (default 10) |
| `WORKER_POLL_INTERVAL_MS` | no                    | Idle poll interval (default 5000)      |

## Testing

```bash
npm test                      # all Vitest projects
```

To include the database tests locally, keep `TEST_DATABASE_URL` set (the Docker Compose setup creates the `pulse_test` database) and apply the migrations to it first:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npm run db:deploy
```

The tests are split into three Vitest projects:

- **unit** (`tests/unit`): URL policy (private ranges, IPv6, encoded IPs, internal hostnames) and the HTTP check, using an injected resolver and transport to cover success, wrong status, DNS failure, refused connections, timeouts, redirects to private targets, the redirect limit and DNS rebinding. It also covers the pinned transport against a local server, uptime maths, check rate limiting and the session guard.
- **integration** (`tests/integration`): runs against a real PostgreSQL when `TEST_DATABASE_URL` is set and is skipped otherwise. CI always sets it. Covers authentication enforcement, cross-user ownership, validation, the monitor limit, pagination, incident open/resolve, duplicate-incident prevention, stale and concurrent result handling, `SKIP LOCKED` claim exclusivity, and status page access and data exposure.
- **components** (`tests/components`): the monitor form (client validation, payload, server field errors) and the status badge.

Outbound HTTP is always mocked or sent to a local test server, never to the internet.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests. Each check is a separate job, so one failure doesn't hide another:

- **Format:** `prettier --check`
- **Lint:** ESLint with the Next.js config
- **Type check:** `tsc --noEmit`
- **Tests:** starts PostgreSQL 16, applies the migrations with `prisma migrate deploy` and runs all three Vitest projects

All jobs install dependencies with `npm ci` from the committed lockfile. CI does not run `next build`.

## Project status and verification

| Area                                       | Status                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Features listed above                      | Implemented                                                                                    |
| Formatting, lint, type check               | Pass in GitHub Actions                                                                         |
| Automated tests                            | Pass in GitHub Actions (unit, integration against PostgreSQL 16, component), with none skipped |
| Database migration                         | Applied successfully by `prisma migrate deploy` in CI                                          |
| Production build (`next build`)            | Not run                                                                                        |
| App and worker run end-to-end in a browser | Not yet done                                                                                   |
| Deployment                                 | None                                                                                           |

The lockfile was generated by `npm install` on a GitHub-hosted runner, not on a developer machine. The current CI status is shown on the repository's Actions tab.

## Known limitations

- **Single location:** checks run from one place, so a regional network issue can look like an outage.
- **No confirmation retries:** one failed check opens an incident, so a brief blip produces a short incident.
- **Sampled uptime:** outages shorter than the check interval can be missed.
- **In-app notifications only:** no email, SMS or webhooks.
- **No login rate limiting, email verification or password reset.** Changing a password doesn't sign out other sessions.
- **No Content-Security-Policy yet:** the inline theme script would need a nonce or hash first.
- **Public status pages aren't cached or rate limited:** each visit runs a query per listed monitor.
- **Paused monitors keep open incidents:** an incident only resolves after the monitor is resumed and a check succeeds.
- **Port probing:** ports aren't restricted, so a user can test whether a port is open on any _public_ address.
- **Pre-release auth library:** Auth.js v5 is pinned to an exact beta release.
- **Limited checks:** only status-code checks with GET/HEAD. No request bodies, custom headers or response assertions.
- **Polling scheduler:** checks start up to one poll interval (5 s) late, and throughput per worker is bounded by the batch size.
- **Retention:** check history is kept for 35 days; incidents are kept indefinitely.
- **Partial index needs care:** future Prisma migrations must be reviewed so they don't drop the partial unique index.

## Future improvements

- Confirm failures with a quick retry, or from a second region, before opening an incident.
- Email and webhook notification channels, behind the existing notification records.
- Rate limiting for sign-in and registration.
- Response assertions (body contains, JSON path) and custom request headers.
- Incident notes and maintenance windows on status pages.
- Aggregated daily rollups so long-term uptime doesn't depend on raw checks.
