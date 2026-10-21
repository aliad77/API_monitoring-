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
      className="inline-flex gap-1 rounded-lg border border-(--edge) bg-(--surface) p-1"
    >
      {(Object.keys(PERIODS) as Period[]).map((period) => (
        <Link
          key={period}
          href={`${basePath}?period=${period}`}
          aria-current={period === current ? "page" : undefined}
          scroll={false}
          className={`rounded-md px-3 py-1 font-pixel text-[11px] tracking-wide uppercase transition active:translate-y-px ${
            period === current
              ? "chrome"
              : "text-haze-600 hover:bg-lavender/10 hover:text-haze-950 dark:text-haze-300 dark:hover:text-white"
          }`}
        >
          {PERIODS[period].label}
        </Link>
      ))}
    </nav>
  );
}
