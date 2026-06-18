import { describe, expect, it } from "vitest";

import { isLevelTwoNotInitiatedError } from "@/lib/t3/errors";

describe("Terminal 3 error classification", () => {
  it("recognizes the genuine Level-2 not-initiated state", () => {
    expect(
      isLevelTwoNotInitiatedError(
        new Error(
          "HTTP 400: Invalid params (precondition_failed: kyc-status called before create-kyc-provider-session)",
        ),
      ),
    ).toBe(true);
  });

  it("does not hide unrelated Terminal 3 failures", () => {
    expect(isLevelTwoNotInitiatedError(new Error("HTTP 401: Session not found"))).toBe(false);
  });
});
