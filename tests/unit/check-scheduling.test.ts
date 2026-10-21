import { describe, expect, it } from "vitest";
import { earliestAllowedCheck } from "@/lib/data/monitors";
import { MIN_SECONDS_BETWEEN_CHECKS } from "@/lib/monitoring/options";

describe("earliestAllowedCheck", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("allows an immediate check for a monitor that has never run", () => {
    expect(earliestAllowedCheck(null, now)).toEqual(now);
  });

  it("allows an immediate check when the last one is old enough", () => {
    const lastCheckedAt = new Date(now.getTime() - 5 * 60 * 1000);
    expect(earliestAllowedCheck(lastCheckedAt, now)).toEqual(now);
  });

  it("delays a check requested too soon after the previous one", () => {
    const lastCheckedAt = new Date(now.getTime() - 10 * 1000);
    expect(earliestAllowedCheck(lastCheckedAt, now)).toEqual(
      new Date(lastCheckedAt.getTime() + MIN_SECONDS_BETWEEN_CHECKS * 1000),
    );
  });
});
