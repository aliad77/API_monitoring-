import {
  CheckCircle2,
  CircleHelp,
  Gauge,
  Plus,
  Radio,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { IncidentList } from "@/components/monitors/incident-list";
import { buttonStyles } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { formatRelative, formatResponseTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireUserId();
  const summary = await getDashboardSummary(userId);
  const { counts } = summary;

  const addMonitor = (
    <Link href="/monitors/new" className={buttonStyles()}>
      <Plus className="size-4" aria-hidden />
      Add monitor
    </Link>
  );

  if (counts.total === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <EmptyState
            icon={Radio}
            title="Create your first monitor"
            description="Pulse checks your endpoint on a schedule, records response times and opens an incident when it goes down."
            action={addMonitor}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${counts.total} monitors · ${summary.checksLast24h} checks in the last 24 hours`}
        actions={addMonitor}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total monitors"
          value={counts.total}
          icon={Radio}
          detail={counts.paused > 0 ? `${counts.paused} paused` : undefined}
        />
        <StatCard
          label="Operational"
          value={counts.up}
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
        />
        <StatCard
          label="Down"
          value={counts.down}
          icon={XCircle}
          iconClassName="text-red-500"
        />
        <StatCard
          label="Pending"
          value={counts.unknown}
          icon={CircleHelp}
          iconClassName="text-amber-500"
          detail="Not checked yet"
        />
        <StatCard
          label="Avg response"
          value={formatResponseTime(summary.avgResponseTimeMs)}
          icon={Gauge}
          detail="Across all checks, last 24h"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent incidents"
            action={
              <Link
                href="/incidents"
                className="text-xs font-medium text-haze-500 hover:text-haze-900 dark:hover:text-haze-100"
              >
                View all
              </Link>
            }
          />
          {summary.recentIncidents.length > 0 ? (
            <IncidentList incidents={summary.recentIncidents} />
          ) : (
            <EmptyState
              icon={ShieldCheck}
              title="No incidents"
              description="Incidents appear here when a monitor goes down."
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Recent checks" />
          {summary.recentChecks.length > 0 ? (
            <ul className="divide-y divide-(--edge)">
              {summary.recentChecks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {check.ok ? (
                      <CheckCircle2
                        className="size-4 shrink-0 text-emerald-500"
                        aria-label="Success"
                      />
                    ) : (
                      <XCircle
                        className="size-4 shrink-0 text-red-500"
                        aria-label="Failed"
                      />
                    )}
                    <Link
                      href={`/monitors/${check.monitor.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {check.monitor.name}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right text-xs text-haze-500 dark:text-haze-400">
                    <span className="font-mono">
                      {check.ok
                        ? formatResponseTime(check.responseTimeMs)
                        : (check.statusCode ?? "error")}
                    </span>
                    <span className="ml-3">
                      {formatRelative(check.checkedAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Gauge}
              title="Waiting for the first checks"
              description="Results appear once the monitoring worker is running (npm run worker)."
            />
          )}
        </Card>
      </div>
    </>
  );
}
