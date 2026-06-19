import { describe, expect, it } from "vitest";

import {
  extractAffinityCookie,
  getAllowedT3Path,
  getT3NodeOrigin,
  rewriteAffinityCookie,
} from "@/lib/t3/proxy";

describe("Terminal 3 same-origin proxy", () => {
  it("allows only the SDK status, contract metadata, and RPC requests", () => {
    expect(getAllowedT3Path("GET", ["status"])).toBe("status");
    expect(getAllowedT3Path("GET", ["api", "contracts", "current"])).toBe(
      "api/contracts/current",
    );
    expect(getAllowedT3Path("POST", ["api", "rpc"])).toBe("api/rpc");
    expect(() => getAllowedT3Path("POST", ["status"])).toThrow("not allowed");
    expect(() => getAllowedT3Path("POST", ["api", "contracts", "current"])).toThrow(
      "not allowed",
    );
    expect(() => getAllowedT3Path("GET", ["api", "admin"])).toThrow("not allowed");
  });

  it("selects a known Terminal 3 node origin", () => {
    expect(getT3NodeOrigin("testnet")).toBe("https://cn-api.sg.testnet.t3n.terminal3.io");
    expect(getT3NodeOrigin("production")).toBe("https://cn-api.sg.prod.t3n.terminal3.io");
  });

  it("forwards only the affinity cookie", () => {
    expect(extractAffinityCookie("other=secret; GCLB=\"affinity-value\"; analytics=id")).toBe(
      'GCLB="affinity-value"',
    );
    expect(extractAffinityCookie("other=secret")).toBeNull();
  });

  it("uses a localhost-compatible affinity cookie for HTTP development", () => {
    expect(rewriteAffinityCookie('GCLB="affinity-value"; Path=/; HttpOnly')).toBe(
      'GCLB="affinity-value"; Path=/api/t3; HttpOnly; SameSite=Lax',
    );
    expect(rewriteAffinityCookie("other=value; Path=/")).toBeNull();
  });

  it("allows the affinity cookie on an HTTPS cross-site adapter", () => {
    expect(rewriteAffinityCookie('GCLB="affinity-value"; Path=/; HttpOnly', true)).toBe(
      'GCLB="affinity-value"; Path=/api/t3; HttpOnly; SameSite=None; Secure',
    );
  });
});
