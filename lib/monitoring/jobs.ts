import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { CheckOutcome } from "./http-check";

// Long enough to cover the slowest allowed check (30 s timeout) plus database
// work. If a worker dies mid-check, the monitor becomes claimable again after
// this lease expires.
export const LEASE_SECONDS = 120;

export type ClaimedMonitor = {
  id: string;
  url: string;
  method: "GET" | "HEAD";
  expectedStatus: number;
  timeoutMs: number;
  intervalSeconds: number;
  leaseToken: string;
};

/**
 * Atomically claims up to `limit` due monitors for this worker.
 *
 * `FOR UPDATE SKIP LOCKED` lets several workers run this query at the same
 * time: rows locked by one worker's claim are skipped by the others instead of
 * being claimed twice or blocking.
 */
export async function claimDueMonitors(
  limit: number,
): Promise<ClaimedMonitor[]> {
  const leaseToken = randomUUID();
  return prisma.$queryRaw<ClaimedMonitor[]>`
    UPDATE "Monitor"
    SET "leaseToken" = ${leaseToken},
        "leaseExpiresAt" = now() + make_interval(secs => ${LEASE_SECONDS}::int)
    WHERE "id" IN (
      SELECT "id" FROM "Monitor"
      WHERE "isActive" = true
        AND "nextCheckAt" <= now()
        AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < now())
      ORDER BY "nextCheckAt"
      LIMIT ${limit}::int
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "url", "method"::text AS "method", "expectedStatus",
              "timeoutMs", "intervalSeconds", "leaseToken"
  `;
}

export type RecordResult = "recorded" | "stale";

/**
 * Stores a check result and applies the resulting status transition in one
 * transaction.
 */
export async function recordCheckResult(
  claim: ClaimedMonitor,
  outcome: CheckOutcome,
  checkedAt: Date,
): Promise<RecordResult> {
  return prisma.$transaction(async (tx) => {
    // Locking the row serialises concurrent completions for the same monitor.
    // Matching the lease token discards results from a worker whose lease was
    // lost: it expired and was re-claimed, or the monitor was edited, paused
    // or deleted while the request was in flight.
    const owned = await tx.$queryRaw<{ userId: string; name: string }[]>`
      SELECT "userId", "name" FROM "Monitor"
      WHERE "id" = ${claim.id} AND "leaseToken" = ${claim.leaseToken}
      FOR UPDATE
    `;
    if (owned.length === 0) {
      return "stale";
    }
    const monitor = owned[0];

    await tx.check.create({
      data: {
        monitorId: claim.id,
        checkedAt,
        ok: outcome.ok,
        statusCode: outcome.statusCode,
        responseTimeMs: outcome.responseTimeMs,
        error: outcome.error,
      },
    });

    // Incidents follow the open-incident row rather than the previous status
    // field, so repeated failures never open a second incident and a recovery
    // always closes the one that is open.
    const openIncident = await tx.incident.findFirst({
      where: { monitorId: claim.id, resolvedAt: null },
    });

    if (!outcome.ok && !openIncident) {
      const cause = outcome.error ?? "Check failed";
      const incident = await tx.incident.create({
        data: { monitorId: claim.id, startedAt: checkedAt, cause },
      });
      await tx.notification.create({
        data: {
          userId: monitor.userId,
          incidentId: incident.id,
          type: "INCIDENT_OPENED",
          title: `${monitor.name} is down`,
          body: cause,
        },
      });
    }

    if (outcome.ok && openIncident) {
      await tx.incident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: checkedAt },
      });
      await tx.notification.create({
        data: {
          userId: monitor.userId,
          incidentId: openIncident.id,
          type: "INCIDENT_RESOLVED",
          title: `${monitor.name} has recovered`,
          body: `Responded with status ${outcome.statusCode}.`,
        },
      });
    }

    await tx.monitor.update({
      where: { id: claim.id },
      data: {
        status: outcome.ok ? "UP" : "DOWN",
        lastCheckedAt: checkedAt,
        lastResponseTimeMs: outcome.responseTimeMs,
        nextCheckAt: new Date(
          checkedAt.getTime() + claim.intervalSeconds * 1000,
        ),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });

    return "recorded";
  });
}

export const CHECK_RETENTION_DAYS = 35;

export async function pruneOldChecks(): Promise<number> {
  const cutoff = new Date(
    Date.now() - CHECK_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const result = await prisma.check.deleteMany({
    where: { checkedAt: { lt: cutoff } },
  });
  return result.count;
}
