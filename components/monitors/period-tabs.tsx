import Link from "next/link";
import { PERIODS, type Period } from "@/lib/monitoring/options";

export function PeriodTabs({
  basePath,
  current,
}: {
  basePath: string;
  current: Period;
}) {
  return (
    <nav
      aria-label="Time period"
      className="inline-flex rounded-md border border-haze-200 p-0.5 dark:border-haze-800"
    >
      {(Object.keys(PERIODS) as Period[]).map((period) => (
        <Link
          key={period}
          href={`${basePath}?period=${period}`}
          aria-current={period === current ? "page" : undefined}
          scroll={false}
          className={`rounded px-3 py-1 text-xs font-medium ${
            period === current
              ? "bg-haze-900 text-white dark:bg-haze-100 dark:text-haze-900"
              : "text-haze-600 hover:text-haze-900 dark:text-haze-400 dark:hover:text-haze-100"
          }`}
        >
          {PERIODS[period].label}
        </Link>
      ))}
    </nav>
  );
}
