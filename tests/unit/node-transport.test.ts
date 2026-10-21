import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { nodeTransport } from "@/lib/monitoring/node-transport";

// These tests talk to a local server directly through the transport, which is
// below the URL policy layer. They prove the connection goes to the pinned
// address rather than wherever the hostname would resolve.

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) =>
    server ? server.close(() => resolve()) : resolve(),
  );
  server = undefined;
});

async function startServer(handler: Parameters<typeof createServer>[1]) {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

const loopback = { address: "127.0.0.1", family: 4 as const };

describe("nodeTransport", () => {
  it("connects to the pinned address without resolving the hostname", async () => {
    const port = await startServer((_request, response) => {
      response.writeHead(204).end();
    });

    // `.invalid` is reserved and can never resolve, so this only succeeds if
    // no DNS lookup happens.
    const response = await nodeTransport({
      url: new URL(`http://pulse-test.invalid:${port}/health`),
      method: "GET",
      address: loopback,
      signal: new AbortController().signal,
    });

    expect(response).toEqual({ statusCode: 204, location: null });
  });

  it("sends only the monitor's own headers", async () => {
    let received: IncomingHttpHeaders = {};
    const port = await startServer((request, response) => {
      received = request.headers;
      response.writeHead(200).end();
    });

    await nodeTransport({
      url: new URL(`http://pulse-test.invalid:${port}/`),
      method: "HEAD",
      address: loopback,
      signal: new AbortController().signal,
    });

    expect(received["user-agent"]).toMatch(/^PulseMonitor/);
    expect(received.cookie).toBeUndefined();
    expect(received.authorization).toBeUndefined();
  });

  it("returns the redirect location without following it", async () => {
    const port = await startServer((_request, response) => {
      response.writeHead(302, { location: "http://127.0.0.1/admin" }).end();
    });

    const response = await nodeTransport({
      url: new URL(`http://pulse-test.invalid:${port}/`),
      method: "GET",
      address: loopback,
      signal: new AbortController().signal,
    });

    expect(response).toEqual({
      statusCode: 302,
      location: "http://127.0.0.1/admin",
    });
  });

  it("resolves as soon as headers arrive, without reading an endless body", async () => {
    const port = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.write("streaming forever...");
      // Never call end().
    });

    const response = await nodeTransport({
      url: new URL(`http://pulse-test.invalid:${port}/`),
      method: "GET",
      address: loopback,
      signal: new AbortController().signal,
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects when the signal is aborted before the server responds", async () => {
    const port = await startServer(() => {
      // Accept the connection but never respond.
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);

    await expect(
      nodeTransport({
        url: new URL(`http://pulse-test.invalid:${port}/`),
        method: "GET",
        address: loopback,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });
});
