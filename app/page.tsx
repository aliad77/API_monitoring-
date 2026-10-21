import {
  Activity,
  BellRing,
  Globe,
  LineChart,
  ShieldCheck,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUserId } from "@/lib/auth/session";

const features = [
  {
    icon: Timer,
    title: "Scheduled HTTP checks",
    description:
      "GET or HEAD requests every 1, 5, 10 or 30 minutes, with a timeout and expected status code per endpoint.",
  },
  {
    icon: LineChart,
    title: "Response-time history",
    description:
      "Every check is stored. Charts and uptime figures are calculated from those recorded results.",
  },
  {
    icon: Activity,
    title: "Incident tracking",
    description:
      "An incident opens on the first failed check and closes automatically when the endpoint recovers.",
  },
  {
    icon: BellRing,
    title: "In-app notifications",
    description:
      "Get notified when a monitor goes down or recovers, with read and unread state.",
  },
  {
    icon: Globe,
    title: "Public status pages",
    description:
      "Share the status, uptime and incident history of selected services — without exposing their URLs.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by default",
    description:
      "Requests to private, loopback and internal networks are blocked, including through redirects and DNS tricks.",
  },
];

export default async function HomePage() {
  const signedIn = Boolean(await getCurrentUserId());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className={buttonStyles("primary", "sm")}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonStyles("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/register" className={buttonStyles("primary", "sm")}>
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center sm:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <span
              className="size-1.5 rounded-full bg-emerald-500"
              aria-hidden
            />
            Uptime and API monitoring
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Know when your endpoints go down — and for how long.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            Pulse checks your websites and APIs on a schedule, records every
            response, and keeps a clear history of outages you can investigate
            and share.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href={signedIn ? "/dashboard" : "/register"}
              className={buttonStyles("primary")}
            >
              {signedIn ? "Go to dashboard" : "Create an account"}
            </Link>
            <a
              href="https://github.com/aliad77/API_monitoring-"
              className={buttonStyles("secondary")}
            >
              View source
            </a>
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="border-t border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <div className="mx-auto max-w-6xl px-6">
            <h2
              id="features-heading"
              className="text-center text-2xl font-semibold tracking-tight"
            >
              What Pulse does
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title}>
                  <div className="mb-3 inline-flex rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Pulse is an open-source portfolio project.
      </footer>
    </div>
  );
}
