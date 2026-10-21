import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { getCurrentUserId, requireUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// `auth` is overloaded (it also works as middleware), so mock it loosely.
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
const findUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user id from the session", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user_1" }, expires: "" });
    findUser.mockResolvedValue({ id: "user_1" });
    await expect(getCurrentUserId()).resolves.toBe("user_1");
  });

  it("rejects a valid token whose account has been deleted", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user_1" }, expires: "" });
    findUser.mockResolvedValue(null);
    await expect(getCurrentUserId()).resolves.toBeNull();
  });

  it("returns null without a session", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(getCurrentUserId()).resolves.toBeNull();
  });

  it("redirects protected pages to the login screen without a session", async () => {
    mockedAuth.mockResolvedValue(null);
    await expect(requireUserId()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
