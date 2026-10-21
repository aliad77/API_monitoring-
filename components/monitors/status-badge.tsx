import { CheckCircle2, CircleHelp, PauseCircle, XCircle } from "lucide-react";

export type DisplayStatus = "UP" | "DOWN" | "UNKNOWN" | "PAUSED";

const styles: Record<
  DisplayStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  UP: {
    label: "Operational",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/20",
    icon: CheckCircle2,
  },
  DOWN: {
    label: "Down",
    className:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-300 dark:ring-red-400/20",
    icon: XCircle,
  },
  UNKNOWN: {
    label: "Pending",
    className:
      "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/20",
    icon: CircleHelp,
  },
  PAUSED: {
    label: "Paused",
    className:
      "bg-haze-100 text-haze-600 ring-haze-500/20 dark:bg-haze-800 dark:text-haze-300 dark:ring-haze-400/20",
    icon: PauseCircle,
  },
};

export function displayStatus(monitor: {
  status: "UP" | "DOWN" | "UNKNOWN";
  isActive: boolean;
}): DisplayStatus {
  return monitor.isActive ? monitor.status : "PAUSED";
}

/** Status is always shown with an icon and text, never colour alone. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  const { label, className, icon: Icon } = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
