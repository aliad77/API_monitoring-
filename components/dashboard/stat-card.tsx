import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName = "text-haze-400",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-haze-200 bg-white p-5 dark:border-haze-800 dark:bg-haze-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-haze-500 dark:text-haze-400">{label}</p>
        <Icon className={`size-4 ${iconClassName}`} aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-haze-500 dark:text-haze-400">
          {detail}
        </p>
      )}
    </div>
  );
}
