import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const incidentSelect = {
  id: true,
  startedAt: true,
  resolvedAt: true,
  cause: true,
  monitor: { select: { id: true, name: true } },
} satisfies Prisma.IncidentSelect;

export type IncidentView = Prisma.IncidentGetPayload<{
  select: typeof incidentSelect;
}>;

export type IncidentFilter = "all" | "open" | "resolved";

export async function listIncidents(
  userId: string,
  {
    cursor,
    limit,
    filter = "all",
    monitorId,
  }: {
    cursor?: string | null;
    limit: number;
    filter?: IncidentFilter;
    monitorId?: string;
  },
) {
  const where: Prisma.IncidentWhereInput = {
    monitor: { userId },
    ...(monitorId ? { monitorId } : {}),
    ...(filter === "open" ? { resolvedAt: null } : {}),
    ...(filter === "resolved" ? { resolvedAt: { not: null } } : {}),
  };

  const incidents = await prisma.incident.findMany({
    where,
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: incidentSelect,
  });

  const hasMore = incidents.length > limit;
  const items = hasMore ? incidents.slice(0, limit) : incidents;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}
