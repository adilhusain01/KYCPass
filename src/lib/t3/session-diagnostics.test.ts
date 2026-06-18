import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifySessionError,
  clearSessionDiagnostics,
  getSessionDiagnostics,
  recordSessionDiagnostic,
} from "@/lib/t3/session-diagnostics";

afterEach(() => {
  clearSessionDiagnostics();
  vi.restoreAllMocks();
});

describe("session diagnostics", () => {
  it("redacts identity and OTP-like values", () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    recordSessionDiagnostic(
      "otp-verify",
      "error",
      "alice@example.com code 443653 wallet 0x1111111111111111111111111111111111111111",
    );

    const serialized = JSON.stringify(getSessionDiagnostics());
    expect(serialized).not.toContain("alice@example.com");
    expect(serialized).not.toContain("443653");
    expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  });

  it("keeps the Level-2 provider precondition readable", () => {
    expect(
      classifySessionError(
        new Error(
          'HTTP 400: Invalid params ({"detail":"precondition_failed: kyc-status called before create-kyc-provider-session"})',
        ),
      ),
    ).toContain("precondition_failed: kyc-status called before create-kyc-provider-session");
  });
});
