import { describe, expect, it } from "vitest";

import {
  assertDisclosureRequestBinding,
  assertMinimumDisclosure,
  createDisclosurePlan,
} from "@/lib/disclosure-policy";
import type { KycRequirement } from "@/lib/domain";

const requirement: KycRequirement = {
  id: "req-test",
  verifierName: "Northstar Bank",
  verifierOrigin: "https://verifier.example",
  purpose: "Open a regulated savings account.",
  requestedClaims: ["verified_email", "country_of_residence"],
  expiresAt: "2030-01-01T00:00:00.000Z",
};

describe("minimum disclosure policy", () => {
  it("maps only requested claims to protected placeholders", () => {
    expect(createDisclosurePlan(requirement)).toEqual({
      requirementId: "req-test",
      claims: ["verified_email", "country_of_residence"],
      placeholders: [
        "profile.verified_contacts.email.value",
        "profile.country_of_residence",
      ],
      rejectedClaims: [],
    });
  });

  it("rejects missing or additional approved claims", () => {
    expect(() => assertMinimumDisclosure(requirement, ["verified_email"])).toThrow(
      "All required claims",
    );
    expect(() =>
      assertMinimumDisclosure(requirement, [
        "verified_email",
        "country_of_residence",
        "address",
      ]),
    ).toThrow("did not request");
  });

  it("accepts the same set regardless of approval order", () => {
    expect(
      assertMinimumDisclosure(requirement, ["country_of_residence", "verified_email"]),
    ).toEqual(["verified_email", "country_of_residence"]);
  });

  it("binds execution to the configured verifier and request expiry", () => {
    expect(() =>
      assertDisclosureRequestBinding(requirement, "https://other.example", new Date("2029-01-01")),
    ).toThrow("does not match");
    expect(() =>
      assertDisclosureRequestBinding(requirement, "https://verifier.example", new Date("2031-01-01")),
    ).toThrow("expired");
    expect(() =>
      assertDisclosureRequestBinding(requirement, "https://verifier.example/", new Date("2029-01-01")),
    ).not.toThrow();
  });

  it("rejects a verifier URL outside the configured origin", () => {
    expect(() =>
      assertDisclosureRequestBinding(
        {
          ...requirement,
          verifierUrl: "https://attacker.example/api/verifier/submit",
        },
        "https://verifier.example",
        new Date("2029-01-01"),
      ),
    ).toThrow("verifier URL does not match");
  });
});
