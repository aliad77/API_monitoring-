import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as statusPageRoute from "@/app/api/status-pages/[id]/route";
import * as statusPagesRoute from "@/app/api/status-pages/route";
import { getCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getPublicStatusPage } from "@/lib/data/status-pages";
import { createMonitor, createUser, deleteCreatedUsers, hasDatabase, jsonRequest, params } from "./helpers";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserId: vi.fn(),
  requireUserId: vi.fn(),
}));

const uniqueSlug = () => `test-${Math.random().toString(36).slice(2, 10)}`;

describe.skipIf(!hasDatabase)("status pages", () => {
  let alice: { id: string };
  let bob: { id: string };

  beforeAll(async () => {
    alice = await createUser();
    bob = await createUser();
  });

  afterAll(deleteCreatedUsers);

  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue(alice.id);
  });

  it("creates a status page with the owner's monitors", async () => {
    const monitor = await createMonitor(alice.id);
    const response = await statusPagesRoute.POST(
      jsonRequest("/api/status-pages", "POST", { title: "Alice status", slug: uniqueSlug(), monitorIds: [monitor.id] }),
    );

    expect(response.status).toBe(201);
    const { statusPage } = await response.json();
    expect(await prisma.statusPageMonitor.count({ where: { statusPageId: statusPage.id } })).toBe(1);
  });

  it("refuses to publish another user's monitor", async () => {
    const bobsMonitor = await createMonitor(bob.id);
    const response = await statusPagesRoute.POST(
      jsonRequest("/api/status-pages", "POST", { title: "Sneaky", slug: uniqueSlug(), monitorIds: [bobsMonitor.id] }),
    );

    expect(response.status).toBe(422);
  });

  it("refuses to add another user's monitor when editing", async () => {
    const page = await prisma.statusPage.create({ data: { userId: alice.id, title: "Mine", slug: uniqueSlug() } });
    const bobsMonitor = await createMonitor(bob.id);

    const response = await statusPageRoute.PATCH(
      jsonRequest("/", "PATCH", { monitorIds: [bobsMonitor.id] }),
      params({ id: page.id }),
    );

    expect(response.status).toBe(422);
    expect(await prisma.statusPageMonitor.count({ where: { statusPageId: page.id } })).toBe(0);
  });

  it("does not let users read, edit or delete someone else's status page", async () => {
    const page = await prisma.statusPage.create({ data: { userId: bob.id, title: "Bob's", slug: uniqueSlug() } });
    const context = params({ id: page.id });

    const responses = await Promise.all([
      statusPageRoute.GET(jsonRequest("/", "GET"), context),
      statusPageRoute.PATCH(jsonRequest("/", "PATCH", { title: "Hijacked" }), context),
      statusPageRoute.DELETE(jsonRequest("/", "DELETE"), context),
    ]);

    expect(responses.map((response) => response.status)).toEqual([404, 404, 404]);
    expect((await prisma.statusPage.findUniqueOrThrow({ where: { id: page.id } })).title).toBe("Bob's");
  });

  it("rejects a slug that is already taken", async () => {
    const slug = uniqueSlug();
    await prisma.statusPage.create({ data: { userId: bob.id, title: "First", slug } });

    const response = await statusPagesRoute.POST(jsonRequest("/api/status-pages", "POST", { title: "Second", slug }));

    expect(response.status).toBe(409);
    expect((await response.json()).fieldErrors).toHaveProperty("slug");
  });

  it("requires authentication", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    const response = await statusPagesRoute.GET();
    expect(response.status).toBe(401);
  });

  describe("public view", () => {
    it("exposes service names, status and incidents but no private configuration", async () => {
      const monitor = await createMonitor(alice.id, {
        name: "Checkout API",
        url: "https://secret-internal-name.example.com/health?token=abc",
        status: "DOWN",
      });
      await prisma.incident.create({ data: { monitorId: monitor.id, cause: "Connection refused" } });
      const slug = uniqueSlug();
      await prisma.statusPage.create({
        data: {
          userId: alice.id,
          title: "Public",
          slug,
          monitors: { create: [{ monitorId: monitor.id }] },
        },
      });

      const page = await getPublicStatusPage(slug);

      expect(page?.services).toEqual([expect.objectContaining({ name: "Checkout API", status: "DOWN" })]);
      expect(page?.incidents).toHaveLength(1);

      const serialized = JSON.stringify(page);
      expect(serialized).not.toContain("secret-internal-name");
      expect(serialized).not.toContain("Connection refused");
      expect(serialized).not.toContain(monitor.id);
      expect(serialized).not.toContain(alice.id);
    });

    it("shows paused monitors as not monitored", async () => {
      const monitor = await createMonitor(alice.id, { isActive: false, status: "UP" });
      const slug = uniqueSlug();
      await prisma.statusPage.create({
        data: { userId: alice.id, title: "Paused", slug, monitors: { create: [{ monitorId: monitor.id }] } },
      });

      const page = await getPublicStatusPage(slug);
      expect(page?.services[0].status).toBe("PAUSED");
    });

    it("returns nothing for an unknown slug", async () => {
      await expect(getPublicStatusPage("does-not-exist-" + uniqueSlug())).resolves.toBeNull();
    });
  });
});
