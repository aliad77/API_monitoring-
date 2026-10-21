import { describe, expect, it } from "vitest";
import {
  isBlockedAddress,
  validateMonitorUrl,
} from "@/lib/monitoring/url-policy";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.5",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "64:ff9b::a00:1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "ff02::1",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each([
    "93.184.215.14",
    "1.1.1.1",
    "8.8.8.8",
    "2606:4700:4700::1111",
    "2a00:1450:4009:81f::200e",
  ])("allows public address %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it("treats anything that is not an IP address as blocked", () => {
    expect(isBlockedAddress("example.com")).toBe(true);
  });
});

describe("validateMonitorUrl", () => {
  it("accepts public http and https URLs", () => {
    expect(validateMonitorUrl("https://api.example.com/health").ok).toBe(true);
    expect(validateMonitorUrl("http://example.com:8080/").ok).toBe(true);
    expect(validateMonitorUrl("https://1.1.1.1/").ok).toBe(true);
  });

  it.each([
    "ftp://example.com",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "gopher://example.com",
  ])("rejects non-http scheme %s", (url) => {
    expect(validateMonitorUrl(url)).toMatchObject({ ok: false });
  });

  it("rejects URLs with embedded credentials", () => {
    const result = validateMonitorUrl("https://user:secret@example.com/");
    expect(result).toEqual({
      ok: false,
      reason: "URLs with embedded credentials are not allowed",
    });
  });

  it.each([
    "http://localhost:3000",
    "http://LOCALHOST.",
    "http://app.localhost",
    "http://printer.local",
    "http://metadata.google.internal",
    "http://router.home.arpa",
    "http://intranet",
  ])("rejects local or internal hostname %s", (url) => {
    expect(validateMonitorUrl(url).ok).toBe(false);
  });

  it.each([
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://192.168.0.1:8080/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    // Alternative IPv4 spellings that URL parsing normalises to 127.0.0.1.
    "http://2130706433/",
    "http://0x7f000001/",
    "http://127.1/",
  ])("rejects private or loopback IP literal %s", (url) => {
    expect(validateMonitorUrl(url).ok).toBe(false);
  });

  it("rejects input that is not a URL", () => {
    expect(validateMonitorUrl("not a url").ok).toBe(false);
  });
});
