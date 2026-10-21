export type DisplayStatus = "UP" | "DOWN" | "UNKNOWN" | "PAUSED";

const styles: Record<
  DisplayStatus,
  { label: string; badge: string; marker: string }
> = {
  UP: {
    label: "Operational",
    badge:
      "bg-emerald-50 text-emerald-800 ring-emerald-600/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    marker: "bg-emerald-500",
  },
  DOWN: {
    label: "Down",
    badge:
      "bg-red-50 text-red-800 ring-red-600/25 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30",
    marker: "bg-red-500 animate-pixel-blink",
  },
  UNKNOWN: {
    label: "Pending",
    badge:
      "bg-amber-50 text-amber-900 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/25",
    marker: "bg-amber-500",
  },
  PAUSED: {
    label: "Paused",
    badge:
      "bg-haze-100 text-haze-700 ring-haze-500/25 dark:bg-haze-800 dark:text-haze-300 dark:ring-haze-400/25",
    marker: "bg-haze-400",
  },
};

export function displayStatus(monitor: {
  status: "UP" | "DOWN" | "UNKNOWN";
  isActive: boolean;
}): DisplayStatus {
  return monitor.isActive ? monitor.status : "PAUSED";
}

/** Status always has a text label; the pixel marker is never the only cue. */
export function StatusBadge({ status }: { status: DisplayStatus }) {
  const { label, badge, marker } = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-pixel text-[11px] tracking-wide uppercase ring-1 ring-inset ${badge}`}
    >
      <span className={`size-1.5 ${marker}`} aria-hidden />
      {label}
    </span>
  );
}
