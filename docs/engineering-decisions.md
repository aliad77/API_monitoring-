# Engineering decisions

This document records the main trade-offs behind Pulse and the reasoning for
each. It describes the code as it exists in this repository.

## One Next.js application plus one worker process

The web UI, the REST API and the authentication flow live in a single Next.js
App Router project. Server components read from the database through small
functions in `lib/data/`, and the same functions back the route handlers in
`app/api/`, so there is one implementation of each query.

The monitoring worker (`worker/index.ts`) is a separate long-running Node.js
process that shares the same `lib/` code and database but is never imported by
the web app. The reasons:

- **Request lifetimes.** A web request should not wait on (or be killed during)
  an outbound check that can take up to 30 seconds.
- **Security boundary.** The web process never makes requests to user-supplied
  URLs. "Check now" only moves `nextCheckAt` forward; the worker performs the
  request. There is no internal "run check" HTTP endpoint that could be called
  directly.
- **Scaling independently.** More workers can be started without touching the
  web tier (see concurrency below).

Splitting into separate services or packages was not justified at this size.

## PostgreSQL as the job queue (no Redis)

Monitors carry their own schedule (`nextCheckAt`) and a lease
(`leaseToken`, `leaseExpiresAt`). A worker claims work with a single statement:

```sql
UPDATE "Monitor" SET "leaseToken" = $token, "leaseExpiresAt" = now() + 120s
WHERE "id" IN (
  SELECT "id" FROM "Monitor"
  WHERE "isActive" AND "nextCheckAt" <= now()
    AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < now())
  ORDER BY "nextCheckAt" LIMIT $n
  FOR UPDATE SKIP LOCKED
)
RETURNING ...
```

`FOR UPDATE SKIP LOCKED` means concurrent workers skip rows another worker is
claiming rather than blocking on them or claiming them twice. The lease means a
crashed worker's monitors become claimable again after 120 seconds.

Redis (or a queue product) would add another service to run, secure and keep
consistent with the database, for a workload of at most a few checks per second.
PostgreSQL already provides the atomicity needed. If check volume grew by orders
of magnitude, the polling query and the `Check` table would be the first things
to revisit.

## Recording results: one transaction, guarded by the lease

`recordCheckResult` runs in a transaction that first locks the monitor row
**and** requires the lease token to still match. That single condition handles
several races:

| Situation                                             | Effect of the guard                                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Two completions for the same claim                    | The second waits on the row lock, then sees the token cleared and is discarded.                          |
| Lease expired, another worker re-claimed and finished | The old worker's token no longer matches; its result is discarded and cannot overwrite the newer status. |
| User edits or pauses the monitor mid-check            | The API clears the lease, so a result for the old URL or settings is discarded.                          |
| Monitor deleted mid-check                             | No row matches; the result is discarded.                                                                 |

Incident transitions are driven by whether an **open incident row** exists,
not by comparing old and new status fields. Repeated failures therefore never
open a second incident, and a success always closes the one that is open. As a
second line of defence, the migration adds a partial unique index:

```sql
CREATE UNIQUE INDEX "Incident_one_open_per_monitor"
  ON "Incident"("monitorId") WHERE "resolvedAt" IS NULL;
```

Prisma's schema language can't express partial indexes, so this lives only in
the SQL migration. Future `prisma migrate dev` runs may propose dropping it;
generated migrations need reviewing for that.

An incident opens on the **first** failed check. Requiring two consecutive
failures, or confirmation from a second location, would reduce false alarms but
is not implemented.

Two consequences of driving incidents from check results are worth knowing:

- Pausing a monitor leaves any open incident open. Nothing resolves it until
  the monitor is resumed and a check succeeds.
- Editing a monitor that is down (for example, fixing its URL) keeps the same
  incident open until the first successful check with the new settings.

## Restricted intervals and timeouts

Intervals are limited to 1, 5, 10 and 30 minutes, and timeouts to 5, 10, 15 or
30 seconds. Fixed options keep the worker's load predictable, make the lease
length easy to reason about (longest timeout plus margin), and keep the UI
simple. Per-user limits (25 monitors, 5 status pages) and a 30-second minimum
gap between user-triggered checks stop one account from turning the worker into
a request generator.

## SSRF protection

Users submit URLs that the server will request, so the worker must not be
usable to reach internal services. The defences are layered:

1. **Static validation** (`lib/monitoring/url-policy.ts`) on create, update and
   every redirect hop: only `http`/`https`, no embedded credentials, no
   `localhost`/`.local`/`.internal`/single-label hostnames, and IP literals must
   be public. URL parsing normalises tricks such as `http://2130706433/` and
   `http://0x7f000001/` to `127.0.0.1` before the check.
2. **DNS validation before connecting** (`lib/monitoring/http-check.ts`): the
   hostname is resolved and _every_ returned address is checked. IPv4 private,
   loopback, link-local (including `169.254.169.254`), CGNAT, multicast and
   reserved ranges are blocked. IPv6 is allowed only inside global unicast
   `2000::/3`, minus documentation, 6to4 and Teredo ranges. This also blocks
   IPv4-mapped forms such as `::ffff:127.0.0.1`.
3. **Pinned connection** (`lib/monitoring/node-transport.ts`): the request is
   made with Node's `http`/`https` module and a custom `lookup` function that
   returns the already-validated addresses. Node never performs a second
   lookup, so a DNS-rebinding server can't answer "public" to the check and
   "private" to the connection. TLS still verifies the certificate against the
   hostname. All validated addresses are passed (not only the first), so Node's
   happy-eyeballs can fall back from IPv6 to IPv4 on hosts without IPv6
   routing. An earlier version pinned a single address and would have reported
   dual-stack sites as unreachable on such hosts.
4. **Manual redirects**: redirects are not followed automatically. Each
   `Location` goes back through steps 1–3, with a limit of 5 hops.
5. **Bounded work**: one overall timeout (`AbortController`) covers DNS and all
   hops; the response body is never read (the socket is destroyed once headers
   arrive) and Node's default 16 KB header limit applies.
6. **No credentials forwarded**: each check uses a fresh connection
   (`agent: false`) and sends only `User-Agent` and `Accept` headers.

Native `fetch` was not used for checks because it doesn't expose a supported
way to pin the connection to a pre-validated address without adding the
`undici` package directly.

Remaining gaps:

- An attacker-controlled public host can still be monitored (that is the
  product's purpose), and ports are not restricted, so the worker can be used
  to probe whether a port is open on a public address.
- The blocklist is maintained by hand and must be kept current as address
  registries change.
- `dns.lookup` runs on libuv's thread pool and can't be cancelled. A timed-out
  lookup keeps its thread until the OS resolver gives up, so many slow lookups
  at once could delay other checks.
- Node's built-in HTTP client ignores `HTTP_PROXY`-style variables unless
  `NODE_USE_ENV_PROXY` is set. Enabling a proxy would bypass the pinning above,
  so the worker must not run with that setting.

## Authentication

Auth.js (v5) with the credentials provider and bcrypt password hashes (cost 12,
via `bcryptjs`). The credentials provider requires JWT sessions, so there are no
session tables. The user id in the signed session token is the **only** source of
identity: `getCurrentUserId()` reads it, and every query for private data
includes `userId` in its `where` clause. Requests for another user's resources
return 404 rather than 403 so ids can't be probed.

Pages call `requireUserId()` themselves instead of relying on middleware, so a
missing check can't be hidden by a matcher configuration. Login compares against
a dummy hash when the email is unknown to keep response times similar.

Because JWTs can't be revoked, `getCurrentUserId()` also confirms the account
still exists (one primary-key lookup per request). A deleted account's token
stops working immediately instead of causing foreign-key errors.

The app sends `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a
strict referrer policy and a restrictive permissions policy. Auth.js session
cookies are `SameSite=Lax`, which blocks cross-site requests to the JSON API
from carrying the session.

Known gaps: no login or registration rate limiting, no email verification, no
password reset. Changing a password does not sign out other sessions. There is
no Content-Security-Policy yet. The inline theme script would need a nonce or a
hash first.

## Uptime calculation

Uptime for a period is `successful checks / total checks × 100`, computed from
stored `Check` rows. It is a **sampled** figure: with a 5-minute interval, a
2-minute outage between checks is invisible. The UI labels it accordingly, and
shows "—" rather than 0% or 100% when there is no data. Charts bucket checks
with PostgreSQL `date_bin` so a 30-day view returns ~120 points instead of tens
of thousands of rows, and the average response time weights each bucket by its
sample count.

Checks older than 35 days are deleted hourly by the worker; incidents are kept.

## Timestamps

All timestamps are `timestamptz`, and raw SQL compares against `now()` rather
than JavaScript `Date` parameters, so results don't depend on the database
session's time zone. The UI shows times in UTC explicitly rather than the
server's local zone.

## Dependencies

- `next-auth` is pinned to an exact v5 beta (`5.0.0-beta.29`). Auth.js v5 has
  been in beta for a long time and is widely used, but it is not a stable
  release, so upgrades should be deliberate.
- Prisma 6 warns that the `package.json#prisma` seed setting is deprecated in
  favour of `prisma.config.ts`. Moving it would also change how Prisma loads
  `.env`, so it was left as is.
- `package-lock.json` was generated by `npm install` on a GitHub-hosted runner
  (Node 22, npm 10) and CI installs with `npm ci`.

## What is deliberately not built

- Email or webhook alerts (only in-app notifications exist).
- Multi-region checks, request bodies, custom headers, keyword assertions.
- Teams or shared ownership of monitors.
