import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName = "text-zinc-400",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        <Icon className={`size-4 ${iconClassName}`} aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {detail}
        </p>
      )}
    </div>
  );
}
