import { describe, expect, it } from "vitest";

import {
  buildTerminalUserProfile,
  receiptSchema,
  requirementSchema,
  userProfileSchema,
} from "@/lib/domain";

describe("relying-party return routing", () => {
  const requirement = {
    id: "northstar-request",
    verifierName: "Northstar Digital Bank",
    verifierOrigin: "https://kyc-pass.vercel.app",
    purpose: "Open a regulated savings account and satisfy identity checks.",
    requestedClaims: ["full_name", "verified_email", "country_of_residence"],
    expiresAt: "2026-06-19T12:00:00.000Z",
  };

  it("allows the known co-hosted relying party", () => {
    expect(requirementSchema.parse({ ...requirement, returnPath: "/northstar" })).toBeTruthy();
  });

  it("rejects arbitrary return URLs", () => {
    expect(() =>
      requirementSchema.parse({ ...requirement, returnPath: "https://attacker.example" }),
    ).toThrow();
  });
});

describe("receipt validation", () => {
  it("accepts a sanitized receipt", () => {
    expect(
      receiptSchema.parse({
        receiptId: "6f7280a1-e133-4417-a426-488fdb70a8f1",
        requestId: "720119e0-9535-48ee-a503-98ecfe18ce50",
        verifier: "Northstar Bank",
        status: "accepted",
        kycLevel: "t3n.user-input.kyc.1",
        disclosedClaims: ["full_name", "verified_email"],
        verifiedAt: "2026-06-13T12:00:00.000Z",
      }),
    ).toBeTruthy();
  });

  it("rejects claim values and unknown claim identifiers", () => {
    expect(() =>
      receiptSchema.parse({
        receiptId: "6f7280a1-e133-4417-a426-488fdb70a8f1",
        requestId: "720119e0-9535-48ee-a503-98ecfe18ce50",
        verifier: "Northstar Bank",
        status: "accepted",
        kycLevel: "t3n.user-input.kyc.1",
        disclosedClaims: ["alice@example.com"],
        verifiedAt: "2026-06-13T12:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("Level-1 profile validation", () => {
  const profile = {
    first_name: "Alice",
    last_name: "Smith",
    country_of_residence: "IN",
    document_issuance_country: "IN",
    address: "A valid residential address",
  };

  it("accepts an omitted SSN represented by a blank form value", () => {
    const parsed = userProfileSchema.parse({ ...profile, ssn: "" });
    expect(parsed.ssn).toBe("");
    expect(buildTerminalUserProfile(parsed)).not.toHaveProperty("ssn");
  });

  it("accepts Terminal 3 supported SSN formats", () => {
    expect(userProfileSchema.parse({ ...profile, ssn: "123456789" }).ssn).toBe("123456789");
    expect(userProfileSchema.parse({ ...profile, ssn: "123-45-6789" }).ssn).toBe(
      "123-45-6789",
    );
  });

  it("rejects non-SSN national identifiers", () => {
    expect(() => userProfileSchema.parse({ ...profile, ssn: "ABCDE1234F" })).toThrow(
      "9-digit US SSN",
    );
  });
});
