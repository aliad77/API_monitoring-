import { BlockList, isIP } from "node:net";

// Addresses the worker must never connect to: loopback, private networks,
// link-local (including cloud metadata at 169.254.169.254), carrier-grade NAT,
// multicast, documentation and other reserved ranges.
const blockedIPv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIPv4.addSubnet(network, prefix, "ipv4");
}

// For IPv6 we allow only global unicast (2000::/3). This rejects loopback,
// unique-local, link-local, multicast, and IPv4-mapped/NAT64 forms that could
// otherwise smuggle a private IPv4 address.
const globalUnicastIPv6 = new BlockList();
globalUnicastIPv6.addSubnet("2000::", 3, "ipv6");

const reservedIPv6 = new BlockList();
reservedIPv6.addSubnet("2001::", 23, "ipv6"); // IETF protocol assignments, incl. Teredo
reservedIPv6.addSubnet("2001:db8::", 32, "ipv6"); // documentation
reservedIPv6.addSubnet("2002::", 16, "ipv6"); // 6to4 can embed any IPv4 address
reservedIPv6.addSubnet("3fff::", 20, "ipv6"); // documentation

export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return blockedIPv4.check(address, "ipv4");
  }
  if (version === 6) {
    return (
      !globalUnicastIPv6.check(address, "ipv6") ||
      reservedIPv6.check(address, "ipv6")
    );
  }
  // Not an IP address at all: refuse rather than guess.
  return true;
}

const INTERNAL_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

export type UrlPolicyResult =
  | { ok: true; url: URL; hostname: string }
  | { ok: false; reason: string };

/**
 * Static checks that need no network access. Hostnames that pass are still
 * resolved and checked against `isBlockedAddress` before every request.
 */
export function validateMonitorUrl(input: string): UrlPolicyResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Enter a valid URL, including http:// or https://" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs can be monitored" };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "URLs with embedded credentials are not allowed" };
  }

  // URL keeps IPv6 literals in brackets and allows a trailing root dot
  // ("localhost."), both of which would slip past naive comparisons.
  const hostname = url.hostname
    .replace(/^\[(.*)\]$/, "$1")
    .replace(/\.$/, "")
    .toLowerCase();

  if (!hostname) {
    return { ok: false, reason: "The URL must include a hostname" };
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      return { ok: false, reason: "Private, loopback and reserved addresses cannot be monitored" };
    }
    return { ok: true, url, hostname };
  }

  if (
    hostname === "localhost" ||
    INTERNAL_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return { ok: false, reason: "Local and internal hostnames cannot be monitored" };
  }
  if (!hostname.includes(".")) {
    return { ok: false, reason: "Use a fully qualified public hostname" };
  }

  return { ok: true, url, hostname };
}
