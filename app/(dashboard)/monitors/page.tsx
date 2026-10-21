import { Plus, Radio } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge, displayStatus } from "@/components/monitors/status-badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserId } from "@/lib/auth/session";
import { listUserMonitors } from "@/lib/data/monitors";
import { getUptimeByMonitor } from "@/lib/data/stats";
import {
  formatInterval,
  formatRelative,
  formatResponseTime,
  formatUptime,
} from "@/lib/format";
import { MAX_MONITORS_PER_USER } from "@/lib/monitoring/options";

export const metadata: Metadata = { title: "Monitors" };

export default async function MonitorsPage() {
  const userId = await requireUserId();
  const monitors = await listUserMonitors(userId);
  const uptime = await getUptimeByMonitor(
    monitors.map((monitor) => monitor.id),
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );

  const atLimit = monitors.length >= MAX_MONITORS_PER_USER;

  return (
    <>
      <PageHeader
        title="Monitors"
        description={`${monitors.length} of ${MAX_MONITORS_PER_USER} monitors used`}
        actions={
          atLimit ? null : (
            <Link href="/monitors/new" className={buttonStyles()}>
              <Plus className="size-4" aria-hidden />
              Add monitor
            </Link>
          )
        }
      />

      <Card>
        {monitors.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No monitors yet"
            description="Add a website or API endpoint and Pulse will start checking it."
            action={
              <Link href="/monitors/new" className={buttonStyles()}>
                Add monitor
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-haze-500 dark:text-haze-400">
                <tr className="border-b border-haze-200 dark:border-haze-800">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Monitor
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 font-medium md:table-cell"
                  >
                    Interval
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 font-medium sm:table-cell"
                  >
                    Last check
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Response
                  </th>
                  <th
                    scope="col"
                    className="hidden px-5 py-3 text-right font-medium sm:table-cell"
                  >
                    Uptime 24h
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-haze-100 dark:divide-haze-800">
                {monitors.map((monitor) => (
                  <tr
                    key={monitor.id}
                    className="hover:bg-haze-50 dark:hover:bg-haze-800/40"
                  >
                    <td className="max-w-xs px-5 py-3">
                      <Link
                        href={`/monitors/${monitor.id}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {monitor.name}
                      </Link>
                      <span className="block truncate font-mono text-xs text-haze-500 dark:text-haze-400">
                        {monitor.method} {monitor.url}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={displayStatus(monitor)} />
                    </td>
                    <td className="hidden px-5 py-3 text-haze-600 md:table-cell dark:text-haze-300">
                      {formatInterval(monitor.intervalSeconds)}
                    </td>
                    <td className="hidden px-5 py-3 text-haze-600 sm:table-cell dark:text-haze-300">
                      {monitor.lastCheckedAt
                        ? formatRelative(monitor.lastCheckedAt)
                        : "Never"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {formatResponseTime(monitor.lastResponseTimeMs)}
                    </td>
                    <td className="hidden px-5 py-3 text-right font-mono text-xs sm:table-cell">
                      {formatUptime(uptime.get(monitor.id) ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
