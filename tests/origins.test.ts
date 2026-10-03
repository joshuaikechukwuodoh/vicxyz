import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { assertOrigin } from "@/lib/api";
const request = (origin?: string, host?: string) =>
  new Request("https://vicxyz.vercel.app/api/admin/auth/login", {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(host ? { Host: host } : {}),
    },
  });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  for (const key of [
    "VERCEL_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_BRANCH_URL",
    "ALLOWED_ORIGINS",
  ])
    vi.stubEnv(key, "");
});
afterEach(() => vi.unstubAllEnvs());
describe("production origin protection", () => {
  it("allows the actual Vercel alias even when APP_URL is still localhost", () => {
    expect(() =>
      assertOrigin(request("https://vicxyz.vercel.app"), true),
    ).not.toThrow();
  });
  it("allows the custom domain", () => {
    expect(() =>
      assertOrigin(request("https://victorpedroautomobile.com"), true),
    ).not.toThrow();
  });
  it("allows the configured app origin", () => {
    vi.stubEnv("APP_URL", "https://configured.example");
    expect(() =>
      assertOrigin(request("https://configured.example"), true),
    ).not.toThrow();
  });
  it("accepts this deployment's trusted Vercel system URLs", () => {
    vi.stubEnv("VERCEL_URL", "vicxyz-deployment.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "vicxyz-production.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "vicxyz-main.vercel.app");
    for (const host of [
      "vicxyz-deployment.vercel.app",
      "vicxyz-production.vercel.app",
      "vicxyz-main.vercel.app",
    ])
      expect(() =>
        assertOrigin(request(`https://${host}`), true),
      ).not.toThrow();
  });
  it("rejects arbitrary Vercel sites and lookalike domains", () => {
    for (const origin of [
      "https://evil.example",
      "https://other.vercel.app",
      "https://vicxyz.vercel.app.evil.example",
      "http://vicxyz.vercel.app",
    ])
      expect(() => assertOrigin(request(origin), true)).toThrow(
        "Request origin is not allowed",
      );
  });
  it("does not trust forged request Host headers", () => {
    expect(() =>
      assertOrigin(request("https://evil.example", "evil.example"), true),
    ).toThrow();
  });
  it("requires an origin for cookie-authenticated mutations", () => {
    expect(() => assertOrigin(request(), true)).toThrow();
    expect(() => assertOrigin(request())).not.toThrow();
  });
  it("ignores malformed configuration without disabling origin protection", () => {
    vi.stubEnv("APP_URL", "not-a-url");
    expect(() =>
      assertOrigin(request("https://vicxyz.vercel.app"), true),
    ).not.toThrow();
    expect(() => assertOrigin(request("https://evil.example"), true)).toThrow();
  });
  it("accepts explicitly configured additional domains", () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://www.victorpedroautomobile.com");
    expect(() =>
      assertOrigin(request("https://www.victorpedroautomobile.com"), true),
    ).not.toThrow();
  });
  it("uses the request origin as a fallback only in development", () => {
    const local = new Request("http://localhost:3005/api/admin/auth/login", {
      method: "POST",
      headers: { Origin: "http://localhost:3005" },
    });
    expect(() => assertOrigin(local, true)).toThrow();
    vi.stubEnv("NODE_ENV", "development");
    expect(() => assertOrigin(local, true)).not.toThrow();
  });
});
