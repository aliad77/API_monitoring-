import { CHECK_INTERVALS } from "@/lib/monitoring/options";

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function formatRelative(date: Date | string, now = new Date()): string {
  const diff = new Date(date).getTime() - now.getTime();
  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit);
    }
  }
  return diff > 0 ? "in a few seconds" : "just now";
}

// Rendered on the server, so we show UTC explicitly rather than the server's
// local time zone.
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDateTime(date: Date | string): string {
  return `${dateTimeFormatter.format(new Date(date))} UTC`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatInterval(seconds: number): string {
  return (
    CHECK_INTERVALS.find((option) => option.seconds === seconds)?.label ??
    `Every ${seconds} seconds`
  );
}

export function formatUptime(uptime: number | null): string {
  if (uptime === null) return "—";
  // Two decimals so 99.99% and 100% stay distinguishable, without implying
  // more precision than sampled data supports.
  return `${uptime === 100 ? "100" : uptime.toFixed(2)}%`;
}

export function formatResponseTime(ms: number | null): string {
  return ms === null ? "—" : `${ms} ms`;
}
