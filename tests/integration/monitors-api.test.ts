import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as monitorRoute from "@/app/api/monitors/[id]/route";
import * as checkNowRoute from "@/app/api/monitors/[id]/check/route";
import * as checksRoute from "@/app/api/monitors/[id]/checks/route";
import * as monitorsRoute from "@/app/api/monitors/route";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { MAX_MONITORS_PER_USER } from "@/lib/monitoring/options";
import { createMonitor, createUser, deleteCreatedUsers, hasDatabase, jsonRequest, params } from "./helpers";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: vi.fn(),
  requireUserId: vi.fn(),
}));

const signInAs = (userId: string | null) => vi.mocked(getCurrentUserId).mockResolvedValue(userId);

const validMonitor = {
  name: "Public API",
  url: "https://api.example.com/health",
  method: "GET",
  expectedStatus: 200,
  intervalSeconds: 300,
  timeoutMs: 10000,
};

describe.skipIf(!hasDatabase)("monitors API", () => {
  let alice: { id: string };
  let bob: { id: string };

  beforeAll(async () => {
    alice = await createUser();
    bob = await createUser();
  });

  afterAll(deleteCreatedUsers);

  beforeEach(() => {
    signInAs(alice.id);
  });

  describe("authentication", () => {
    it("rejects every endpoint without a session", async () => {
      signInAs(null);
      const monitor = await createMonitor(alice.id);
      const context = params({ id: monitor.id });

      const responses = await Promise.all([
        monitorsRoute.GET(),
        monitorsRoute.POST(jsonRequest("/api/monitors", "POST", validMonitor)),
        monitorRoute.GET(jsonRequest(`/api/monitors/${monitor.id}`, "GET"), context),
        monitorRoute.PATCH(jsonRequest(`/api/monitors/${monitor.id}`, "PATCH", { name: "x" }), context),
        monitorRoute.DELETE(jsonRequest(`/api/monitors/${monitor.id}`, "DELETE"), context),
        checksRoute.GET(jsonRequest(`/api/monitors/${monitor.id}/checks`, "GET"), context),
        checkNowRoute.POST(jsonRequest(`/api/monitors/${monitor.id}/check`, "POST"), context),
      ]);

      expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
      expect(await prisma.monitor.findUnique({ where: { id: monitor.id } })).not.toBeNull();
    });
  });

  describe("creation", () => {
    it("creates a monitor owned by the signed-in user", async () => {
      const response = await monitorsRoute.POST(jsonRequest("/api/monitors", "POST", validMonitor));
      expect(response.status).toBe(201);

      const { monitor } = await response.json();
      expect(monitor).toMatchObject({ name: "Public API", status: "UNKNOWN", isActive: true });
      expect(monitor).not.toHaveProperty("leaseToken");
      expect(monitor).not.toHaveProperty("userId");

      const stored = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
      expect(stored.userId).toBe(alice.id);
    });

    it("ignores a userId supplied in the request body", async () => {
      const response = await monitorsRoute.POST(
        jsonRequest("/api/monitors", "POST", { ...validMonitor, userId: bob.id }),
      );
      const { monitor } = await response.json();

      const stored = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
      expect(stored.userId).toBe(alice.id);
    });

    it.each([
      [{ url: "http://localhost:5432" }, "url"],
      [{ url: "http://169.254.169.254/latest/meta-data" }, "url"],
      [{ url: "ftp://example.com" }, "url"],
      [{ name: "" }, "name"],
      [{ expectedStatus: 99 }, "expectedStatus"],
      [{ intervalSeconds: 5 }, "intervalSeconds"],
      [{ timeoutMs: 120000 }, "timeoutMs"],
      [{ method: "POST" }, "method"],
    ])("rejects invalid input %j", async (override, field) => {
      const response = await monitorsRoute.POST(
        jsonRequest("/api/monitors", "POST", { ...validMonitor, ...override }),
      );

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.fieldErrors).toHaveProperty(field);
    });

    it("rejects malformed JSON", async () => {
      const request = new Request("http://localhost/api/monitors", { method: "POST", body: "{not json" });
      const response = await monitorsRoute.POST(request);
      expect(response.status).toBe(400);
    });

    it("enforces the per-user monitor limit", async () => {
      const user = await createUser();
      signInAs(user.id);
      await prisma.monitor.createMany({
        data: Array.from({ length: MAX_MONITORS_PER_USER }, (_, index) => ({
          userId: user.id,
          name: `Monitor ${index}`,
          url: "https://example.com/",
          isActive: false,
        })),
      });

      const response = await monitorsRoute.POST(jsonRequest("/api/monitors", "POST", validMonitor));
      expect(response.status).toBe(403);
      expect(await prisma.monitor.count({ where: { userId: user.id } })).toBe(MAX_MONITORS_PER_USER);
    });
  });

  describe("ownership", () => {
    it("lists only the signed-in user's monitors", async () => {
      const own = await createMonitor(alice.id, { name: "Alice's" });
      const other = await createMonitor(bob.id, { name: "Bob's" });

      const { monitors } = await (await monitorsRoute.GET()).json();
      const ids = monitors.map((monitor: { id: string }) => monitor.id);

      expect(ids).toContain(own.id);
      expect(ids).not.toContain(other.id);
    });

    it("returns 404 for another user's monitor on every endpoint and changes nothing", async () => {
      const bobsMonitor = await createMonitor(bob.id, { name: "Bob's private monitor" });
      const context = params({ id: bobsMonitor.id });

      const responses = await Promise.all([
        monitorRoute.GET(jsonRequest(`/api/monitors/${bobsMonitor.id}`, "GET"), context),
        monitorRoute.PATCH(jsonRequest(`/api/monitors/${bobsMonitor.id}`, "PATCH", { name: "Hijacked" }), context),
        monitorRoute.DELETE(jsonRequest(`/api/monitors/${bobsMonitor.id}`, "DELETE"), context),
        checksRoute.GET(jsonRequest(`/api/monitors/${bobsMonitor.id}/checks`, "GET"), context),
        checkNowRoute.POST(jsonRequest(`/api/monitors/${bobsMonitor.id}/check`, "POST"), context),
      ]);

      expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
      const stored = await prisma.monitor.findUniqueOrThrow({ where: { id: bobsMonitor.id } });
      expect(stored.name).toBe("Bob's private monitor");
    });
  });

  describe("updates", () => {
    it("pauses and resumes a monitor", async () => {
      const monitor = await createMonitor(alice.id);
      const context = params({ id: monitor.id });

      const paused = await monitorRoute.PATCH(jsonRequest("/", "PATCH", { isActive: false }), context);
      expect((await paused.json()).monitor.isActive).toBe(false);

      const resumed = await monitorRoute.PATCH(jsonRequest("/", "PATCH", { isActive: true }), context);
      expect((await resumed.json()).monitor.isActive).toBe(true);
    });

    it("clears the worker lease so an in-flight result for the old settings is discarded", async () => {
      const monitor = await createMonitor(alice.id, {
        leaseToken: "in-flight",
        leaseExpiresAt: new Date(Date.now() + 60_000),
      });

      await monitorRoute.PATCH(
        jsonRequest("/", "PATCH", { url: "https://changed.example.com/" }),
        params({ id: monitor.id }),
      );

      const stored = await prisma.monitor.findUniqueOrThrow({ where: { id: monitor.id } });
      expect(stored.url).toBe("https://changed.example.com/");
      expect(stored.leaseToken).toBeNull();
    });

    it("refuses a manual check for a paused monitor", async () => {
      const monitor = await createMonitor(alice.id, { isActive: false });
      const response = await checkNowRoute.POST(jsonRequest("/", "POST"), params({ id: monitor.id }));
      expect(response.status).toBe(409);
    });

    it("deletes a monitor and its history", async () => {
      const monitor = await createMonitor(alice.id);
      await prisma.check.create({ data: { monitorId: monitor.id, ok: true, statusCode: 200, responseTimeMs: 50 } });

      const response = await monitorRoute.DELETE(jsonRequest("/", "DELETE"), params({ id: monitor.id }));

      expect(response.status).toBe(204);
      expect(await prisma.check.count({ where: { monitorId: monitor.id } })).toBe(0);
    });
  });

  describe("check history", () => {
    it("paginates checks newest first with a cursor", async () => {
      const monitor = await createMonitor(alice.id);
      const base = Date.now();
      await prisma.check.createMany({
        data: Array.from({ length: 5 }, (_, index) => ({
          monitorId: monitor.id,
          checkedAt: new Date(base - index * 60_000),
          ok: true,
          statusCode: 200,
          responseTimeMs: 100 + index,
        })),
      });
      const context = params({ id: monitor.id });

      const first = await (await checksRoute.GET(jsonRequest(`/x?limit=2`, "GET"), context)).json();
      expect(first.items.map((check: { responseTimeMs: number }) => check.responseTimeMs)).toEqual([100, 101]);
      expect(first.nextCursor).toBeTruthy();

      const second = await (
        await checksRoute.GET(jsonRequest(`/x?limit=2&cursor=${first.nextCursor}`, "GET"), context)
      ).json();
      expect(second.items.map((check: { responseTimeMs: number }) => check.responseTimeMs)).toEqual([102, 103]);

      const third = await (
        await checksRoute.GET(jsonRequest(`/x?limit=2&cursor=${second.nextCursor}`, "GET"), context)
      ).json();
      expect(third.items).toHaveLength(1);
      expect(third.nextCursor).toBeNull();
    });
  });
});
