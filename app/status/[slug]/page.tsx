import { CheckCircle2, CircleHelp, PauseCircle, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getPublicStatusPage,
  type PublicStatusPage,
} from "@/lib/data/status-pages";
import { formatDateTime, formatDuration, formatUptime } from "@/lib/format";

// Always render from current data; there is no caching layer to invalidate.
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// Shared between generateMetadata and the page so the data is loaded once.
const loadPage = cache(getPublicStatusPage);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const page = await loadPage((await params).slug);
  return { title: page ? `${page.title} status` : "Status page not found" };
}

type ServiceStatus = PublicStatusPage["services"][number]["status"];

const serviceLabels: Record<
  ServiceStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  UP: {
    label: "Operational",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  DOWN: {
    label: "Outage",
    icon: XCircle,
    className: "text-red-600 dark:text-red-400",
  },
  UNKNOWN: {
    label: "No data yet",
    icon: CircleHelp,
    className: "text-amber-600 dark:text-amber-400",
  },
  PAUSED: {
    label: "Not monitored",
    icon: PauseCircle,
    className: "text-haze-500",
  },
};

function overallStatus(services: PublicStatusPage["services"]) {
  const down = services.filter((service) => service.status === "DOWN").length;
  if (down === 0) {
    return { text: "All systems operational", className: "bg-emerald-600" };
  }
  if (down === services.length) {
    return { text: "Major outage", className: "bg-red-600" };
  }
  return { text: "Partial outage", className: "bg-amber-600" };
}

function dayBarClass(uptime: number | null) {
  if (uptime === null) return "bg-haze-200 dark:bg-haze-800";
  if (uptime >= 99) return "bg-emerald-500";
  if (uptime >= 95) return "bg-amber-500";
  return "bg-red-500";
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export default async function PublicStatusPageView({ params }: PageProps) {
  const page = await loadPage((await params).slug);
  if (!page) notFound();

  const overall = overallStatus(page.services);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {page.title}
          </h1>
          {page.description && (
            <p className="mt-1 text-sm text-haze-500 dark:text-haze-400">
              {page.description}
            </p>
          )}
        </div>
        <ThemeToggle />
      </header>

      {page.services.length > 0 && (
        <div
          className={`mb-8 rounded-lg px-5 py-4 font-medium text-white ${overall.className}`}
        >
          {overall.text}
        </div>
      )}

      <section
        aria-labelledby="services-heading"
        className="rounded-lg border border-haze-200 bg-white dark:border-haze-800 dark:bg-haze-900"
      >
        <h2
          id="services-heading"
          className="border-b border-haze-200 px-5 py-3 text-sm font-semibold dark:border-haze-800"
        >
          Services
        </h2>
        {page.services.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-haze-500">
            No services are listed on this page yet.
          </p>
        ) : (
          <ul className="divide-y divide-haze-100 dark:divide-haze-800">
            {page.services.map((service, index) => {
              const {
                label,
                icon: Icon,
                className,
              } = serviceLabels[service.status];
              return (
                <li key={`${service.name}-${index}`} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{service.name}</p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm ${className}`}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </span>
                  </div>
                  <div
                    className="mt-3 flex h-8 gap-0.5"
                    role="img"
                    aria-label={`Daily uptime for the last 30 days: ${formatUptime(service.uptime)} overall`}
                  >
                    {service.days.map((day) => (
                      <div
                        key={day.date}
                        title={`${dayFormat.format(new Date(day.date))}: ${formatUptime(day.uptime)}`}
                        className={`flex-1 rounded-sm ${dayBarClass(day.uptime)}`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-haze-500 dark:text-haze-400">
                    <span>
                      {dayFormat.format(new Date(service.days[0].date))}
                    </span>
                    <span>{formatUptime(service.uptime)} uptime (sampled)</span>
                    <span>Today</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="incidents-heading" className="mt-8">
        <h2 id="incidents-heading" className="mb-3 text-sm font-semibold">
          Incidents in the last 30 days
        </h2>
        {page.incidents.length === 0 ? (
          <p className="text-sm text-haze-500 dark:text-haze-400">
            No incidents reported.
          </p>
        ) : (
          <ul className="space-y-3">
            {page.incidents.map((incident) => (
              <li
                key={`${incident.serviceName}-${incident.startedAt}`}
                className="rounded-lg border border-haze-200 bg-white px-5 py-3 text-sm dark:border-haze-800 dark:bg-haze-900"
              >
                <p className="font-medium">
                  {incident.serviceName}{" "}
                  {incident.resolvedAt ? "was unavailable" : "is unavailable"}
                </p>
                <p className="mt-1 text-haze-500 dark:text-haze-400">
                  Started {formatDateTime(incident.startedAt)}
                  {incident.resolvedAt
                    ? ` · resolved after ${formatDuration(new Date(incident.resolvedAt).getTime() - new Date(incident.startedAt).getTime())}`
                    : " · ongoing"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-12 flex justify-center text-sm text-haze-500">
        <span className="inline-flex items-center gap-2">
          Powered by <Logo />
        </span>
      </footer>
    </div>
  );
}
