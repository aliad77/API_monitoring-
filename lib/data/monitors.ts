import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MIN_SECONDS_BETWEEN_CHECKS } from "@/lib/monitoring/options";

// Fields that are safe to return to the monitor's owner. Worker lease fields
// are deliberately excluded.
export const monitorSelect = {
  id: true,
  name: true,
  url: true,
  method: true,
  expectedStatus: true,
  intervalSeconds: true,
  timeoutMs: true,
  isActive: true,
  status: true,
  lastCheckedAt: true,
  lastResponseTimeMs: true,
  nextCheckAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MonitorSelect;

export type MonitorView = Prisma.MonitorGetPayload<{ select: typeof monitorSelect }>;

export function findUserMonitor(userId: string, monitorId: string) {
  return prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: monitorSelect,
  });
}

export function listUserMonitors(userId: string) {
  return prisma.monitor.findMany({
    where: { userId },
    select: monitorSelect,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * The soonest a user action may schedule the next check, so repeated
 * "check now" clicks or edits can't turn the worker into a request flooder.
 */
export function earliestAllowedCheck(lastCheckedAt: Date | null, now = new Date()): Date {
  if (!lastCheckedAt) return now;
  const earliest = new Date(lastCheckedAt.getTime() + MIN_SECONDS_BETWEEN_CHECKS * 1000);
  return earliest > now ? earliest : now;
}

export async function listChecks(
  monitorId: string,
  { cursor, limit }: { cursor?: string | null; limit: number },
) {
  const checks = await prisma.check.findMany({
    where: { monitorId },
    orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      checkedAt: true,
      ok: true,
      statusCode: true,
      responseTimeMs: true,
      error: true,
    },
  });

  const hasMore = checks.length > limit;
  const items = hasMore ? checks.slice(0, limit) : checks;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}
