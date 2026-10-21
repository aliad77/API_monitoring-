import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedAddress, validateMonitorUrl } from "./url-policy";
import { nodeTransport, type Transport } from "./node-transport";

export const MAX_REDIRECTS = 5;

export type CheckTarget = {
  url: string;
  method: "GET" | "HEAD";
  expectedStatus: number;
  timeoutMs: number;
};

export type CheckOutcome = {
  ok: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  error: string | null;
};

export type ResolvedAddress = { address: string; family: 4 | 6 };

export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type CheckDependencies = {
  resolve: Resolver;
  transport: Transport;
};

const defaultDependencies: CheckDependencies = {
  resolve: async (hostname) => {
    const results = await lookup(hostname, { all: true, verbatim: true });
    return results.map((result) => ({
      address: result.address,
      family: result.family === 6 ? 6 : 4,
    }));
  },
  transport: nodeTransport,
};

/** Policy failures that should be reported to the user as-is. */
class CheckError extends Error {}

export async function runHttpCheck(
  target: CheckTarget,
  dependencies: CheckDependencies = defaultDependencies,
): Promise<CheckOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), target.timeoutMs);
  const startedAt = performance.now();

  // A monitor that expects a 3xx is checking the redirect itself, so we must
  // not follow it.
  const followRedirects =
    target.expectedStatus < 300 || target.expectedStatus >= 400;

  try {
    let currentUrl = target.url;

    for (let redirects = 0; ; redirects++) {
      const policy = validateMonitorUrl(currentUrl);
      if (!policy.ok) {
        throw new CheckError(policy.reason);
      }

      const address = await resolvePublicAddress(
        policy.hostname,
        dependencies.resolve,
        controller.signal,
      );

      const response = await dependencies.transport({
        url: policy.url,
        method: target.method,
        address,
        signal: controller.signal,
      });

      if (
        followRedirects &&
        isRedirect(response.statusCode) &&
        response.location
      ) {
        if (redirects >= MAX_REDIRECTS) {
          throw new CheckError(`Stopped after ${MAX_REDIRECTS} redirects`);
        }
        // Every hop goes back through validation and DNS checks at the top of
        // the loop, so a redirect cannot lead to an internal address.
        currentUrl = new URL(response.location, policy.url).toString();
        continue;
      }

      const responseTimeMs = Math.round(performance.now() - startedAt);
      const ok = response.statusCode === target.expectedStatus;
      return {
        ok,
        statusCode: response.statusCode,
        responseTimeMs,
        error: ok
          ? null
          : `Expected status ${target.expectedStatus}, received ${response.statusCode}`,
      };
    }
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      responseTimeMs: null,
      error: describeFailure(
        error,
        controller.signal.aborted,
        target.timeoutMs,
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function resolvePublicAddress(
  hostname: string,
  resolve: Resolver,
  signal: AbortSignal,
): Promise<ResolvedAddress> {
  if (isIP(hostname)) {
    // Literal addresses were already checked by validateMonitorUrl.
    return { address: hostname, family: isIP(hostname) === 6 ? 6 : 4 };
  }

  const addresses = await abortable(resolve(hostname), signal);
  if (addresses.length === 0) {
    throw new CheckError(`DNS lookup for ${hostname} returned no addresses`);
  }
  // Reject the host if *any* record is internal, rather than picking a public
  // one, so a mixed record set can't be used to probe internal services.
  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new CheckError(
      `${hostname} resolves to a private or reserved address`,
    );
  }
  return addresses[0];
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("aborted"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function describeFailure(
  error: unknown,
  timedOut: boolean,
  timeoutMs: number,
): string {
  if (timedOut) {
    return `Timed out after ${timeoutMs} ms`;
  }
  if (error instanceof CheckError) {
    return error.message;
  }

  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  switch (code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
    case "ENODATA":
      return "DNS lookup failed";
    case "ECONNREFUSED":
      return "Connection refused";
    case "ECONNRESET":
      return "Connection reset by the server";
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "Host unreachable";
    case "HPE_HEADER_OVERFLOW":
      return "Response headers too large";
  }
  if (code && (code.startsWith("ERR_TLS") || code.includes("CERT"))) {
    return `TLS error (${code})`;
  }
  return "Request failed";
}
