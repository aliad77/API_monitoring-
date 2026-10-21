import { prisma } from "@/lib/db";
import { incidentSelect } from "./incidents";

export async function getDashboardSummary(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [statusGroups, paused, responseTime, recentIncidents, recentChecks] =
    await Promise.all([
      prisma.monitor.groupBy({
        by: ["status"],
        where: { userId, isActive: true },
        _count: { _all: true },
      }),
      prisma.monitor.count({ where: { userId, isActive: false } }),
      prisma.check.aggregate({
        where: { monitor: { userId }, checkedAt: { gte: since } },
        _avg: { responseTimeMs: true },
        _count: { _all: true },
      }),
      prisma.incident.findMany({
        where: { monitor: { userId } },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: incidentSelect,
      }),
      prisma.check.findMany({
        where: { monitor: { userId } },
        orderBy: { checkedAt: "desc" },
        take: 8,
        select: {
          id: true,
          checkedAt: true,
          ok: true,
          statusCode: true,
          responseTimeMs: true,
          error: true,
          monitor: { select: { id: true, name: true } },
        },
      }),
    ]);

  const countFor = (status: "UP" | "DOWN" | "UNKNOWN") =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  const up = countFor("UP");
  const down = countFor("DOWN");
  const unknown = countFor("UNKNOWN");
  const avg = responseTime._avg.responseTimeMs;

  return {
    counts: { total: up + down + unknown + paused, up, down, unknown, paused },
    avgResponseTimeMs: avg === null ? null : Math.round(avg),
    checksLast24h: responseTime._count._all,
    recentIncidents,
    recentChecks,
  };
}
