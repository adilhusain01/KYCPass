import { describe, expect, it } from "vitest";

import { isTeeReachableVerifierOrigin } from "@/lib/env";

describe("verifier origin readiness", () => {
  it("requires a public HTTPS origin for Terminal 3 TEE egress", () => {
    expect(isTeeReachableVerifierOrigin("https://kycpass.example")).toBe(true);
    expect(isTeeReachableVerifierOrigin("http://localhost:3000")).toBe(false);
    expect(isTeeReachableVerifierOrigin("https://127.0.0.1")).toBe(false);
  });
});
