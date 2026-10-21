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
    <div className="glass rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="font-pixel text-[11px] tracking-wide text-haze-600 uppercase dark:text-haze-300">
          {label}
        </p>
        <Icon className={`size-4 shrink-0 ${iconClassName}`} aria-hidden />
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight tabular-nums">
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
