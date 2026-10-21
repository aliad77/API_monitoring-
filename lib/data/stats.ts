import { prisma } from "@/lib/db";

export type SeriesPoint = {
  bucketStart: Date;
  total: number;
  okCount: number;
  timedCount: number;
  avgResponseTimeMs: number | null;
};

/**
 * Uptime is the share of successful checks among the checks actually
 * recorded. It is a sample: an outage shorter than the check interval can be
 * missed entirely. Returns null when there are no checks to measure.
 */
export function calculateUptime(okCount: number, total: number): number | null {
  if (total === 0) return null;
  return (okCount / total) * 100;
}

export function summarizeSeries(points: SeriesPoint[]) {
  let total = 0;
  let okCount = 0;
  let timedCount = 0;
  let responseTimeSum = 0;

  for (const point of points) {
    total += point.total;
    okCount += point.okCount;
    if (point.avgResponseTimeMs !== null) {
      // Weight each bucket's average by its sample count to get the true mean.
      timedCount += point.timedCount;
      responseTimeSum += point.avgResponseTimeMs * point.timedCount;
    }
  }

  return {
    totalChecks: total,
    uptime: calculateUptime(okCount, total),
    avgResponseTimeMs: timedCount > 0 ? Math.round(responseTimeSum / timedCount) : null,
  };
}

/** Checks grouped into fixed time buckets, oldest first. */
export function getCheckSeries(monitorId: string, hours: number, bucket: string) {
  return prisma.$queryRaw<SeriesPoint[]>`
    SELECT
      date_bin(${bucket}::interval, "checkedAt", TIMESTAMPTZ '2000-01-01 00:00:00+00') AS "bucketStart",
      count(*)::int AS "total",
      count(*) FILTER (WHERE "ok")::int AS "okCount",
      count("responseTimeMs")::int AS "timedCount",
      avg("responseTimeMs")::float8 AS "avgResponseTimeMs"
    FROM "Check"
    WHERE "monitorId" = ${monitorId}
      AND "checkedAt" >= now() - make_interval(hours => ${hours}::int)
    GROUP BY 1
    ORDER BY 1
  `;
}

/** Uptime percentage per monitor since a point in time, in one query. */
export async function getUptimeByMonitor(monitorIds: string[], since: Date) {
  const groups = await prisma.check.groupBy({
    by: ["monitorId", "ok"],
    where: { monitorId: { in: monitorIds }, checkedAt: { gte: since } },
    _count: { _all: true },
  });

  const totals = new Map<string, { ok: number; total: number }>();
  for (const group of groups) {
    const entry = totals.get(group.monitorId) ?? { ok: 0, total: 0 };
    entry.total += group._count._all;
    if (group.ok) entry.ok += group._count._all;
    totals.set(group.monitorId, entry);
  }

  const uptime = new Map<string, number | null>();
  for (const id of monitorIds) {
    const entry = totals.get(id);
    uptime.set(id, entry ? calculateUptime(entry.ok, entry.total) : null);
  }
  return uptime;
}
