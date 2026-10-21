import { describe, expect, it, vi } from "vitest";
import {
  MAX_REDIRECTS,
  runHttpCheck,
  type CheckTarget,
  type ResolvedAddress,
  type Resolver,
} from "@/lib/monitoring/http-check";
import type {
  Transport,
  TransportRequest,
} from "@/lib/monitoring/node-transport";

const PUBLIC: ResolvedAddress = { address: "93.184.215.14", family: 4 };
const OTHER_PUBLIC: ResolvedAddress = { address: "1.1.1.1", family: 4 };
const PRIVATE: ResolvedAddress = { address: "10.0.0.7", family: 4 };

const target: CheckTarget = {
  url: "https://api.example.com/health",
  method: "GET",
  expectedStatus: 200,
  timeoutMs: 1000,
};

function resolverFor(records: Record<string, ResolvedAddress[]>): Resolver {
  return vi.fn(async (hostname: string) => {
    const result = records[hostname];
    if (!result)
      throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    return result;
  });
}

function transportReturning(
  statusCode: number,
  location: string | null = null,
): Transport {
  return vi.fn(async () => ({ statusCode, location }));
}

describe("runHttpCheck", () => {
  it("reports success when the status matches and measures response time", async () => {
    const transport = transportReturning(200);
    const outcome = await runHttpCheck(target, {
      resolve: resolverFor({ "api.example.com": [PUBLIC] }),
      transport,
    });

    expect(outcome).toMatchObject({ ok: true, statusCode: 200, error: null });
    expect(outcome.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("connects to the address that passed validation", async () => {
    const transport = transportReturning(200);
    await runHttpCheck(target, {
      resolve: resolverFor({ "api.example.com": [PUBLIC] }),
      transport,
    });

    const request = vi.mocked(transport).mock.calls[0][0] as TransportRequest;
    expect(request.addresses).toEqual([PUBLIC]);
    expect(request.url.hostname).toBe("api.example.com");
    expect(request.method).toBe("GET");
  });

  it("passes every validated address so the connection can fall back", async () => {
    const ipv6: ResolvedAddress = {
      address: "2606:4700:4700::1111",
      family: 6,
    };
    const transport = transportReturning(200);
    await runHttpCheck(target, {
      resolve: resolverFor({ "api.example.com": [ipv6, PUBLIC] }),
      transport,
    });

    expect(vi.mocked(transport).mock.calls[0][0].addresses).toEqual([
      ipv6,
      PUBLIC,
    ]);
  });

  it("detects an unexpected status code", async () => {
    const outcome = await runHttpCheck(target, {
      resolve: resolverFor({ "api.example.com": [PUBLIC] }),
      transport: transportReturning(503),
    });

    expect(outcome).toMatchObject({
      ok: false,
      statusCode: 503,
      error: "Expected status 200, received 503",
    });
  });

  it("reports DNS failures", async () => {
    const outcome = await runHttpCheck(target, {
      resolve: resolverFor({}),
      transport: transportReturning(200),
    });

    expect(outcome).toEqual({
      ok: false,
      statusCode: null,
      responseTimeMs: null,
      error: "DNS lookup failed",
    });
  });

  it("reports refused connections", async () => {
    const transport: Transport = vi.fn(async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), {
        code: "ECONNREFUSED",
      });
    });
    const outcome = await runHttpCheck(target, {
      resolve: resolverFor({ "api.example.com": [PUBLIC] }),
      transport,
    });

    expect(outcome.error).toBe("Connection refused");
  });

  it("times out a request that never responds", async () => {
    const transport: Transport = ({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });

    const outcome = await runHttpCheck(
      { ...target, timeoutMs: 50 },
      { resolve: resolverFor({ "api.example.com": [PUBLIC] }), transport },
    );

    expect(outcome).toMatchObject({
      ok: false,
      error: "Timed out after 50 ms",
    });
  });

  it("applies the timeout to slow DNS resolution too", async () => {
    const resolve: Resolver = () => new Promise(() => {});
    const outcome = await runHttpCheck(
      { ...target, timeoutMs: 50 },
      { resolve, transport: transportReturning(200) },
    );

    expect(outcome.error).toBe("Timed out after 50 ms");
  });

  describe("SSRF protection", () => {
    it("refuses hosts that resolve to a private address without connecting", async () => {
      const transport = transportReturning(200);
      const outcome = await runHttpCheck(target, {
        resolve: resolverFor({ "api.example.com": [PRIVATE] }),
        transport,
      });

      expect(outcome.ok).toBe(false);
      expect(outcome.error).toBe(
        "api.example.com resolves to a private or reserved address",
      );
      expect(transport).not.toHaveBeenCalled();
    });

    it("refuses hosts where any one of several records is private", async () => {
      const transport = transportReturning(200);
      const outcome = await runHttpCheck(target, {
        resolve: resolverFor({ "api.example.com": [PUBLIC, PRIVATE] }),
        transport,
      });

      expect(outcome.ok).toBe(false);
      expect(transport).not.toHaveBeenCalled();
    });

    it("resolves once per hop, so a rebinding DNS server cannot swap in a private address", async () => {
      // First answer is public, every later answer is private. A client that
      // validated one lookup and then connected using another would be fooled.
      let calls = 0;
      const resolve: Resolver = vi.fn(async () =>
        calls++ === 0 ? [PUBLIC] : [PRIVATE],
      );
      const transport = transportReturning(200);

      const outcome = await runHttpCheck(target, { resolve, transport });

      expect(outcome.ok).toBe(true);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(vi.mocked(transport).mock.calls[0][0].addresses).toEqual([PUBLIC]);
    });

    it("follows redirects to public hosts and validates every hop", async () => {
      const resolve = resolverFor({
        "api.example.com": [PUBLIC],
        "www.example.org": [OTHER_PUBLIC],
      });
      const transport: Transport = vi.fn(async ({ url }: TransportRequest) =>
        url.hostname === "api.example.com"
          ? { statusCode: 301, location: "https://www.example.org/health" }
          : { statusCode: 200, location: null },
      );

      const outcome = await runHttpCheck(target, { resolve, transport });

      expect(outcome).toMatchObject({ ok: true, statusCode: 200 });
      expect(resolve).toHaveBeenCalledWith("www.example.org");
      expect(vi.mocked(transport).mock.calls[1][0].addresses).toEqual([
        OTHER_PUBLIC,
      ]);
    });

    it("blocks a redirect to a private IP literal", async () => {
      const transport: Transport = vi.fn(async () => ({
        statusCode: 302,
        location: "http://169.254.169.254/latest/meta-data/",
      }));

      const outcome = await runHttpCheck(target, {
        resolve: resolverFor({ "api.example.com": [PUBLIC] }),
        transport,
      });

      expect(outcome.ok).toBe(false);
      expect(outcome.error).toMatch(/Private, loopback and reserved addresses/);
      expect(transport).toHaveBeenCalledTimes(1);
    });

    it("blocks a redirect to a hostname that resolves privately", async () => {
      const transport: Transport = vi.fn(async ({ url }: TransportRequest) =>
        url.hostname === "api.example.com"
          ? { statusCode: 307, location: "https://internal.example.net/" }
          : { statusCode: 200, location: null },
      );
      const resolve = resolverFor({
        "api.example.com": [PUBLIC],
        "internal.example.net": [PRIVATE],
      });

      const outcome = await runHttpCheck(target, { resolve, transport });

      expect(outcome.error).toBe(
        "internal.example.net resolves to a private or reserved address",
      );
      expect(transport).toHaveBeenCalledTimes(1);
    });

    it("blocks a redirect to a non-http scheme", async () => {
      const transport = transportReturning(302, "file:///etc/passwd");
      const outcome = await runHttpCheck(target, {
        resolve: resolverFor({ "api.example.com": [PUBLIC] }),
        transport,
      });

      expect(outcome.error).toBe("Only http and https URLs can be monitored");
    });

    it(`stops after ${MAX_REDIRECTS} redirects`, async () => {
      const transport = transportReturning(302, "/again");
      const outcome = await runHttpCheck(target, {
        resolve: resolverFor({ "api.example.com": [PUBLIC] }),
        transport,
      });

      expect(outcome.error).toBe(`Stopped after ${MAX_REDIRECTS} redirects`);
      expect(transport).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
    });
  });

  it("does not follow redirects when the monitor expects a 3xx status", async () => {
    const transport = transportReturning(301, "https://www.example.org/");
    const outcome = await runHttpCheck(
      { ...target, expectedStatus: 301 },
      { resolve: resolverFor({ "api.example.com": [PUBLIC] }), transport },
    );

    expect(outcome).toMatchObject({ ok: true, statusCode: 301 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
