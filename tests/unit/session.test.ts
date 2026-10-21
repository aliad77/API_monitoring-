import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { getCurrentUserId, requireUserId } from "@/lib/auth/session";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// `auth` is overloaded (it also works as middleware), so mock it loosely.
const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("session helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user id from the session", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user_1" }, expires: "" });
    await expect(getCurrentUserId()).resolves.toBe("user_1");
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
