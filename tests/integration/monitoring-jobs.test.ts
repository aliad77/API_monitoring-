import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { CheckOutcome } from "@/lib/monitoring/http-check";
import {
  claimDueMonitors,
  recordCheckResult,
  type ClaimedMonitor,
} from "@/lib/monitoring/jobs";
import {
  createMonitor,
  createUser,
  deleteCreatedUsers,
  hasDatabase,
} from "./helpers";

const success: CheckOutcome = {
  ok: true,
  statusCode: 200,
  responseTimeMs: 120,
  error: null,
};
const failure: CheckOutcome = {
  ok: false,
  statusCode: 503,
  responseTimeMs: 80,
  error: "Expected status 200, received 503",
};

describe.skipIf(!hasDatabase)("monitoring jobs", () => {
  let userId: string;

  beforeAll(async () => {
    userId = (await createUser()).id;
  });

  afterAll(deleteCreatedUsers);

  /**
   * A monitor with a valid lease held by the test, exactly as if a worker had
   * claimed it. The lease also keeps other test files' claim queries away.
   */
  async function leasedMonitor(): Promise<ClaimedMonitor> {
    const leaseToken = randomUUID();
    const monitor = await createMonitor(userId, {
      leaseToken,
      leaseExpiresAt: new Date(Date.now() + 120_000),
    });
    return {
      id: monitor.id,
      url: monitor.url,
      method: monitor.method,
      expectedStatus: monitor.expectedStatus,
      timeoutMs: monitor.timeoutMs,
      intervalSeconds: monitor.intervalSeconds,
      leaseToken,
    };
  }

  /** Simulates the worker claiming the monitor again for its next check. */
  async function reclaim(claim: ClaimedMonitor): Promise<ClaimedMonitor> {
    const leaseToken = randomUUID();
    await prisma.monitor.update({
      where: { id: claim.id },
      data: { leaseToken, leaseExpiresAt: new Date(Date.now() + 120_000) },
    });
    return { ...claim, leaseToken };
  }

  describe("recording results", () => {
    it("records a successful check and schedules the next one", async () => {
      const claim = await leasedMonitor();
      const checkedAt = new Date();

      await expect(recordCheckResult(claim, success, checkedAt)).resolves.toBe(
        "recorded",
      );

      const monitor = await prisma.monitor.findUniqueOrThrow({
        where: { id: claim.id },
      });
      expect(monitor.status).toBe("UP");
      expect(monitor.lastResponseTimeMs).toBe(120);
      expect(monitor.leaseToken).toBeNull();
      expect(monitor.nextCheckAt.getTime()).toBe(
        checkedAt.getTime() + claim.intervalSeconds * 1000,
      );
      expect(await prisma.check.count({ where: { monitorId: claim.id } })).toBe(
        1,
      );
      expect(
        await prisma.incident.count({ where: { monitorId: claim.id } }),
      ).toBe(0);
    });

    it("opens an incident and notifies the owner when a monitor goes down", async () => {
      const claim = await leasedMonitor();
      await recordCheckResult(claim, failure, new Date());

      const incidents = await prisma.incident.findMany({
        where: { monitorId: claim.id },
      });
      expect(incidents).toHaveLength(1);
      expect(incidents[0]).toMatchObject({
        resolvedAt: null,
        cause: failure.error,
      });

      const notifications = await prisma.notification.findMany({
        where: { incidentId: incidents[0].id },
      });
      expect(notifications).toEqual([
        expect.objectContaining({
          userId,
          type: "INCIDENT_OPENED",
          readAt: null,
        }),
      ]);
    });

    it("does not open a second incident for repeated failures", async () => {
      let claim = await leasedMonitor();
      for (let attempt = 0; attempt < 3; attempt++) {
        await recordCheckResult(claim, failure, new Date());
        claim = await reclaim(claim);
      }

      expect(
        await prisma.incident.count({ where: { monitorId: claim.id } }),
      ).toBe(1);
      expect(await prisma.check.count({ where: { monitorId: claim.id } })).toBe(
        3,
      );
      expect(
        await prisma.notification.count({
          where: { incident: { monitorId: claim.id }, type: "INCIDENT_OPENED" },
        }),
      ).toBe(1);
    });

    it("resolves the open incident when the monitor recovers", async () => {
      let claim = await leasedMonitor();
      const failedAt = new Date(Date.now() - 5 * 60_000);
      await recordCheckResult(claim, failure, failedAt);
      claim = await reclaim(claim);

      const recoveredAt = new Date();
      await recordCheckResult(claim, success, recoveredAt);

      const incident = await prisma.incident.findFirstOrThrow({
        where: { monitorId: claim.id },
      });
      expect(incident.startedAt).toEqual(failedAt);
      expect(incident.resolvedAt).toEqual(recoveredAt);

      const monitor = await prisma.monitor.findUniqueOrThrow({
        where: { id: claim.id },
      });
      expect(monitor.status).toBe("UP");
      expect(
        await prisma.notification.count({
          where: { incidentId: incident.id, type: "INCIDENT_RESOLVED" },
        }),
      ).toBe(1);
    });

    it("opens a new incident if the monitor fails again after recovering", async () => {
      let claim = await leasedMonitor();
      for (const outcome of [failure, success, failure]) {
        await recordCheckResult(claim, outcome, new Date());
        claim = await reclaim(claim);
      }

      const incidents = await prisma.incident.findMany({
        where: { monitorId: claim.id },
        orderBy: { startedAt: "asc" },
      });
      expect(incidents).toHaveLength(2);
      expect(incidents[0].resolvedAt).not.toBeNull();
      expect(incidents[1].resolvedAt).toBeNull();
    });
  });

  describe("concurrency", () => {
    it("discards a result whose lease was lost, without touching the newer state", async () => {
      const original = await leasedMonitor();
      // The lease expired and another worker re-claimed and completed a check.
      const newer = await reclaim(original);
      await recordCheckResult(newer, success, new Date());

      await expect(
        recordCheckResult(original, failure, new Date()),
      ).resolves.toBe("stale");

      const monitor = await prisma.monitor.findUniqueOrThrow({
        where: { id: original.id },
      });
      expect(monitor.status).toBe("UP");
      expect(
        await prisma.check.count({ where: { monitorId: original.id } }),
      ).toBe(1);
      expect(
        await prisma.incident.count({ where: { monitorId: original.id } }),
      ).toBe(0);
    });

    it("records only one of two simultaneous completions for the same claim", async () => {
      const claim = await leasedMonitor();

      const results = await Promise.all([
        recordCheckResult(claim, failure, new Date()),
        recordCheckResult(claim, failure, new Date()),
      ]);

      expect(results.sort()).toEqual(["recorded", "stale"]);
      expect(await prisma.check.count({ where: { monitorId: claim.id } })).toBe(
        1,
      );
      expect(
        await prisma.incident.count({ where: { monitorId: claim.id } }),
      ).toBe(1);
    });

    it("rejects a second open incident at the database level", async () => {
      const monitor = await createMonitor(userId, { isActive: false });
      await prisma.incident.create({
        data: { monitorId: monitor.id, cause: "first" },
      });

      await expect(
        prisma.incident.create({
          data: { monitorId: monitor.id, cause: "second" },
        }),
      ).rejects.toMatchObject({
        code: "P2002",
      });
    });

    it("never gives the same monitor to two workers claiming at the same time", async () => {
      const due = await Promise.all(
        Array.from({ length: 8 }, () =>
          createMonitor(userId, { nextCheckAt: new Date(Date.now() - 1000) }),
        ),
      );
      const dueIds = new Set(due.map((monitor) => monitor.id));

      const [first, second] = await Promise.all([
        claimDueMonitors(100),
        claimDueMonitors(100),
      ]);
      const mine = [...first, ...second].filter((claim) =>
        dueIds.has(claim.id),
      );

      expect(mine).toHaveLength(due.length);
      expect(new Set(mine.map((claim) => claim.id)).size).toBe(due.length);
      expect(
        first.some((claim) => second.some((other) => other.id === claim.id)),
      ).toBe(false);
    });

    it("does not claim paused, future or already-leased monitors", async () => {
      const paused = await createMonitor(userId, {
        isActive: false,
        nextCheckAt: new Date(Date.now() - 1000),
      });
      const future = await createMonitor(userId, {
        nextCheckAt: new Date(Date.now() + 3_600_000),
      });
      const leased = await leasedMonitor();

      const claimed = (await claimDueMonitors(100)).map((claim) => claim.id);

      expect(claimed).not.toContain(paused.id);
      expect(claimed).not.toContain(future.id);
      expect(claimed).not.toContain(leased.id);
    });

    it("re-claims a monitor whose lease has expired", async () => {
      const abandoned = await createMonitor(userId, {
        nextCheckAt: new Date(Date.now() - 1000),
        leaseToken: "crashed-worker",
        leaseExpiresAt: new Date(Date.now() - 1000),
      });

      const claimed = await claimDueMonitors(100);
      const claim = claimed.find((entry) => entry.id === abandoned.id);

      expect(claim).toBeDefined();
      expect(claim?.leaseToken).not.toBe("crashed-worker");
    });
  });
});
