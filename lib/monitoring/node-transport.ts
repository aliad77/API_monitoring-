import type { LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import type { ResolvedAddress } from "./http-check";

export type TransportRequest = {
  url: URL;
  method: "GET" | "HEAD";
  address: ResolvedAddress;
  signal: AbortSignal;
};

export type TransportResponse = {
  statusCode: number;
  location: string | null;
};

export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

const USER_AGENT = "PulseMonitor/1.0 (+https://github.com/aliad77/API_monitoring-)";

type LookupCallback = (error: Error | null, address: string | LookupAddress[], family?: number) => void;

/**
 * A DNS lookup that always answers with the address that already passed the
 * URL policy. Node would otherwise do its own lookup, which a DNS rebinding
 * attack could answer with a private IP.
 */
function pinnedLookup(address: ResolvedAddress): LookupFunction {
  const lookup = (_hostname: string, options: { all?: boolean }, callback: LookupCallback) => {
    if (options.all) {
      callback(null, [{ address: address.address, family: address.family }]);
    } else {
      callback(null, address.address, address.family);
    }
  };
  // Node calls `lookup` with `all: true` when happy-eyeballs is enabled (the
  // default) and without it otherwise. @types/node only describes the first
  // shape, so the cast covers the second.
  return lookup as unknown as LookupFunction;
}

/**
 * Performs a single HTTP request (no redirect handling) against an address
 * that has already been approved by the URL policy.
 */
export const nodeTransport: Transport = ({ url, method, address, signal }) => {
  const options: https.RequestOptions = {
    method,
    signal,
    lookup: pinnedLookup(address),
    // A fresh connection per check: no shared sockets, no cookies, and only
    // these headers are ever sent to monitored targets. For HTTPS the
    // certificate is still verified against the original hostname.
    agent: false,
    headers: { "user-agent": USER_AGENT, accept: "*/*" },
  };

  return new Promise((resolve, reject) => {
    const onResponse = (response: IncomingMessage) => {
      const location = response.headers.location ?? null;
      // Only the status line and headers matter. Destroying the response
      // means a large or endless body is never downloaded.
      response.destroy();
      resolve({ statusCode: response.statusCode ?? 0, location });
    };

    const request =
      url.protocol === "https:"
        ? https.request(url, options, onResponse)
        : http.request(url, options, onResponse);
    request.on("error", reject);
    request.end();
  });
};
