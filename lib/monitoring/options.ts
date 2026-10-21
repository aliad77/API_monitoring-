// Shared by the API validation and the client-side form, so this file must not
// import any server-only modules.

export const CHECK_INTERVALS = [
  { seconds: 60, label: "Every minute" },
  { seconds: 300, label: "Every 5 minutes" },
  { seconds: 600, label: "Every 10 minutes" },
  { seconds: 1800, label: "Every 30 minutes" },
] as const;

export const REQUEST_TIMEOUTS = [
  { ms: 5000, label: "5 seconds" },
  { ms: 10000, label: "10 seconds" },
  { ms: 15000, label: "15 seconds" },
  { ms: 30000, label: "30 seconds" },
] as const;

export const HTTP_METHODS = ["GET", "HEAD"] as const;

export const MAX_MONITORS_PER_USER = 25;
export const MAX_STATUS_PAGES_PER_USER = 5;

// Manual "check now" requests and config edits can never schedule checks for a
// monitor closer together than this.
export const MIN_SECONDS_BETWEEN_CHECKS = 30;

export const PERIODS = {
  "24h": { label: "24 hours", hours: 24, bucket: "15 minutes" },
  "7d": { label: "7 days", hours: 24 * 7, bucket: "2 hours" },
  "30d": { label: "30 days", hours: 24 * 30, bucket: "6 hours" },
} as const;

export type Period = keyof typeof PERIODS;

export function parsePeriod(value: string | null | undefined): Period {
  return value === "7d" || value === "30d" ? value : "24h";
}
