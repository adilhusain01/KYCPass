import { describe, expect, it } from "vitest";

import { agentDisclosureActionSchema } from "@/lib/agent/actions";

const action = {
  action: "kyc.disclose",
  invocationId: "4ae03c51-f1b9-4c7f-9acc-a3ec70d5d2e7",
  request: {
    requestId: "64bb4058-591c-49ac-9674-4183d98c7ea0",
    userDid: "did:t3n:0123456789abcdef0123456789abcdef01234567",
    requirement: {
      id: "bank-identity-check",
      verifierName: "Northstar Digital Bank",
      verifierOrigin: "https://bank.example",
      verifierUrl: "https://bank.example/api/kycpass/verifier",
      purpose: "Verify identity before opening a regulated bank account.",
      requestedClaims: ["full_name", "verified_email", "country_of_residence"],
      expiresAt: "2026-06-22T23:00:00.000Z",
    },
    approvedClaims: ["full_name", "verified_email", "country_of_residence"],
  },
} as const;

describe("agent disclosure action", () => {
  it("accepts a typed action without private identity values", () => {
    expect(agentDisclosureActionSchema.parse(action)).toEqual(action);
  });

  it("rejects an unknown action", () => {
    expect(() => agentDisclosureActionSchema.parse({ ...action, action: "profile.read" })).toThrow();
  });
});
