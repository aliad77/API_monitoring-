import Link from "next/link";
import { PERIODS, type Period } from "@/lib/monitoring/options";

export function PeriodTabs({ basePath, current }: { basePath: string; current: Period }) {
  return (
    <nav aria-label="Time period" className="inline-flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
      {(Object.keys(PERIODS) as Period[]).map((period) => (
        <Link
          key={period}
          href={`${basePath}?period=${period}`}
          aria-current={period === current ? "page" : undefined}
          scroll={false}
          className={`rounded px-3 py-1 text-xs font-medium ${
            period === current
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {PERIODS[period].label}
        </Link>
      ))}
    </nav>
  );
}
