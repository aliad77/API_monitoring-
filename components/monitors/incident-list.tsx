import Link from "next/link";
import type { IncidentView } from "@/lib/data/incidents";
import { formatDateTime, formatDuration } from "@/lib/format";

export function IncidentList({
  incidents,
  showMonitor = true,
}: {
  incidents: IncidentView[];
  showMonitor?: boolean;
}) {
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {incidents.map((incident) => {
        const end = incident.resolvedAt ?? new Date();
        const duration = formatDuration(
          end.getTime() - incident.startedAt.getTime(),
        );
        return (
          <li
            key={incident.id}
            className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2 shrink-0 rounded-full ${incident.resolvedAt ? "bg-zinc-400" : "bg-red-500"}`}
                  aria-hidden
                />
                {showMonitor ? (
                  <Link
                    href={`/monitors/${incident.monitor.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {incident.monitor.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">
                    {incident.resolvedAt ? "Resolved" : "Ongoing"}
                  </span>
                )}
                {showMonitor && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {incident.resolvedAt ? "Resolved" : "Ongoing"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
                {incident.cause}
              </p>
            </div>
            <div className="shrink-0 text-xs text-zinc-500 sm:text-right dark:text-zinc-400">
              <p>Started {formatDateTime(incident.startedAt)}</p>
              <p>
                {incident.resolvedAt ? "Lasted" : "Ongoing for"} {duration}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
