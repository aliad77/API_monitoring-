import { describe, expect, it } from "vitest";
import {
  calculateUptime,
  summarizeSeries,
  type SeriesPoint,
} from "@/lib/data/stats";

function point(
  total: number,
  okCount: number,
  avgResponseTimeMs: number | null,
  timedCount = total,
): SeriesPoint {
  return {
    bucketStart: new Date(),
    total,
    okCount,
    timedCount,
    avgResponseTimeMs,
  };
}

describe("calculateUptime", () => {
  it("is the percentage of successful checks", () => {
    expect(calculateUptime(99, 100)).toBe(99);
    expect(calculateUptime(1, 3)).toBeCloseTo(33.333, 3);
    expect(calculateUptime(10, 10)).toBe(100);
  });

  it("is unknown rather than 0% or 100% when there are no checks", () => {
    expect(calculateUptime(0, 0)).toBeNull();
  });
});

describe("summarizeSeries", () => {
  it("combines buckets into overall uptime", () => {
    const summary = summarizeSeries([point(10, 10, 100), point(10, 5, 200)]);
    expect(summary.totalChecks).toBe(20);
    expect(summary.uptime).toBe(75);
  });

  it("weights average response time by the number of samples in each bucket", () => {
    // 9 samples at 100 ms and 1 sample at 1000 ms: the mean is 190 ms, not 550 ms.
    const summary = summarizeSeries([point(9, 9, 100), point(1, 1, 1000)]);
    expect(summary.avgResponseTimeMs).toBe(190);
  });

  it("ignores buckets where no request produced a timing", () => {
    const summary = summarizeSeries([point(5, 0, null, 0), point(5, 5, 120)]);
    expect(summary.avgResponseTimeMs).toBe(120);
    expect(summary.uptime).toBe(50);
  });

  it("returns empty values for an empty period", () => {
    expect(summarizeSeries([])).toEqual({
      totalChecks: 0,
      uptime: null,
      avgResponseTimeMs: null,
    });
  });
});
