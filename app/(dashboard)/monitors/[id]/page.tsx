import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckHistory } from "@/components/monitors/check-history";
import { IncidentList } from "@/components/monitors/incident-list";
import { MonitorActions } from "@/components/monitors/monitor-actions";
import { PeriodTabs } from "@/components/monitors/period-tabs";
import { ResponseTimeChart } from "@/components/monitors/response-time-chart";
import { StatusBadge, displayStatus } from "@/components/monitors/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUserId } from "@/lib/auth/session";
import { listIncidents } from "@/lib/data/incidents";
import { findUserMonitor, listChecks } from "@/lib/data/monitors";
import { getCheckSeries, summarizeSeries } from "@/lib/data/stats";
import {
  formatInterval,
  formatRelative,
  formatResponseTime,
  formatUptime,
} from "@/lib/format";
import { PERIODS, parsePeriod } from "@/lib/monitoring/options";

export const metadata: Metadata = { title: "Monitor" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function MonitorPage({ params, searchParams }: PageProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const period = parsePeriod((await searchParams).period);

  const monitor = await findUserMonitor(userId, id);
  if (!monitor) notFound();

  const { hours, bucket, label } = PERIODS[period];
  const [series, checks, incidents] = await Promise.all([
    getCheckSeries(monitor.id, hours, bucket),
    listChecks(monitor.id, { limit: 20 }),
    listIncidents(userId, { monitorId: monitor.id, limit: 10 }),
  ]);
  const stats = summarizeSeries(series);

  return (
    <>
      <Link
        href="/monitors"
        className="mb-4 inline-flex items-center gap-1 text-sm text-haze-500 hover:text-haze-900 dark:text-haze-400 dark:hover:text-haze-100"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Monitors
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {monitor.name}
            </h1>
            <StatusBadge status={displayStatus(monitor)} />
          </div>
          <p className="mt-1 truncate font-mono text-sm text-haze-500 dark:text-haze-400">
            {monitor.method} {monitor.url}
          </p>
        </div>
        <MonitorActions monitor={monitor} />
      </div>

      <dl className="glass grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm sm:grid-cols-4">
        <div>
          <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Last checked</dt>
          <dd className="mt-1 font-medium">
            {monitor.lastCheckedAt
              ? formatRelative(monitor.lastCheckedAt)
              : "Never"}
          </dd>
        </div>
        <div>
          <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Last response</dt>
          <dd className="mt-1 font-medium">
            {formatResponseTime(monitor.lastResponseTimeMs)}
          </dd>
        </div>
        <div>
          <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Interval</dt>
          <dd className="mt-1 font-medium">
            {formatInterval(monitor.intervalSeconds)}
          </dd>
        </div>
        <div>
          <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Expects</dt>
          <dd className="mt-1 font-medium">
            HTTP {monitor.expectedStatus} within {monitor.timeoutMs / 1000}s
          </dd>
        </div>
      </dl>

      <Card className="mt-6">
        <div className="flex flex-col gap-4 border-b border-(--edge) px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">
                Uptime ({label})
              </dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">
                {formatUptime(stats.uptime)}
              </dd>
            </div>
            <div>
              <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Avg response</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">
                {formatResponseTime(stats.avgResponseTimeMs)}
              </dd>
            </div>
            <div>
              <dt className="font-pixel text-[11px] tracking-wide text-haze-500 uppercase dark:text-haze-400">Checks</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">
                {stats.totalChecks}
              </dd>
            </div>
          </dl>
          <PeriodTabs basePath={`/monitors/${monitor.id}`} current={period} />
        </div>
        <div className="px-2 py-4 sm:px-4">
          <ResponseTimeChart
            multiDay={period !== "24h"}
            points={series.map((point) => ({
              time: point.bucketStart.toISOString(),
              avgResponseTimeMs: point.avgResponseTimeMs,
              total: point.total,
              failed: point.total - point.okCount,
            }))}
          />
        </div>
        <p className="border-t border-(--edge) px-5 py-3 text-xs text-haze-500 dark:text-haze-400">
          Uptime is the percentage of successful checks in this period. Outages
          shorter than the check interval may not be detected.
        </p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Recent checks" />
          <CheckHistory
            monitorId={monitor.id}
            initialCursor={checks.nextCursor}
            initialChecks={checks.items.map((check) => ({
              ...check,
              checkedAt: check.checkedAt.toISOString(),
            }))}
          />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Incidents"
            action={
              incidents.nextCursor ? (
                <Link
                  href="/incidents"
                  className="text-xs font-medium text-haze-500 hover:text-haze-900 dark:hover:text-haze-100"
                >
                  View all
                </Link>
              ) : undefined
            }
          />
          {incidents.items.length > 0 ? (
            <IncidentList incidents={incidents.items} showMonitor={false} />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No incidents"
              description="This monitor hasn't had any recorded downtime."
            />
          )}
        </Card>
      </div>
    </>
  );
}
