import { prisma } from "@/lib/db";
import {
  calculateUptime,
  getCheckSeries,
  summarizeSeries,
  type SeriesPoint,
} from "./stats";

export function listUserStatusPages(userId: string) {
  return prisma.statusPage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      _count: { select: { monitors: true } },
    },
  });
}

export function findUserStatusPage(userId: string, statusPageId: string) {
  return prisma.statusPage.findFirst({
    where: { id: statusPageId, userId },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      monitors: { orderBy: { position: "asc" }, select: { monitorId: true } },
    },
  });
}

/** True only if every id belongs to a monitor owned by this user. */
export async function ownsAllMonitors(userId: string, monitorIds: string[]) {
  if (monitorIds.length === 0) return true;
  const unique = [...new Set(monitorIds)];
  const owned = await prisma.monitor.count({
    where: { userId, id: { in: unique } },
  });
  return owned === unique.length;
}

const PUBLIC_HISTORY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** One entry per UTC day, oldest first, including days with no checks. */
function lastDays(points: SeriesPoint[], count: number) {
  const byDay = new Map(
    points.map((point) => [point.bucketStart.getTime(), point]),
  );
  const today = Math.floor(Date.now() / DAY_MS) * DAY_MS;

  return Array.from({ length: count }, (_, index) => {
    const dayStart = today - (count - 1 - index) * DAY_MS;
    const point = byDay.get(dayStart);
    return {
      date: new Date(dayStart).toISOString(),
      uptime: point ? calculateUptime(point.okCount, point.total) : null,
    };
  });
}

/**
 * Everything a public visitor may see. Each query selects fields explicitly
 * so monitor URLs, owner details and worker state can never leak through.
 */
export async function getPublicStatusPage(slug: string) {
  const page = await prisma.statusPage.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      monitors: {
        orderBy: { position: "asc" },
        select: {
          monitor: {
            select: { id: true, name: true, status: true, isActive: true },
          },
        },
      },
    },
  });
  if (!page) return null;

  const monitors = page.monitors.map((entry) => entry.monitor);
  const since = new Date(Date.now() - PUBLIC_HISTORY_DAYS * DAY_MS);

  const [services, incidents] = await Promise.all([
    Promise.all(
      monitors.map(async (monitor) => {
        const days = await getCheckSeries(
          monitor.id,
          PUBLIC_HISTORY_DAYS * 24,
          "1 day",
        );
        return {
          name: monitor.name,
          status: monitor.isActive ? monitor.status : ("PAUSED" as const),
          uptime: summarizeSeries(days).uptime,
          days: lastDays(days, PUBLIC_HISTORY_DAYS),
        };
      }),
    ),
    prisma.incident.findMany({
      where: {
        monitorId: { in: monitors.map((m) => m.id) },
        startedAt: { gte: since },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        startedAt: true,
        resolvedAt: true,
        monitor: { select: { name: true } },
      },
    }),
  ]);

  return {
    title: page.title,
    description: page.description,
    services,
    incidents: incidents.map((incident) => ({
      serviceName: incident.monitor.name,
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    })),
  };
}

export type PublicStatusPage = NonNullable<
  Awaited<ReturnType<typeof getPublicStatusPage>>
>;
