import { describe, expect, it } from "vitest";

import { buildPartnerRequirement } from "@/lib/partner-verification";

describe("partner verification requests", () => {
  it("binds the requirement to the partner verifier callback origin", () => {
    const requirement = buildPartnerRequirement(
      {
        partner: {
          id: "northstar-digital-bank",
          name: "Northstar Digital Bank",
          origin: "https://northstar.example",
          verifierUrl: "https://northstar.example/api/kycpass/verifier",
        },
        purpose: "Open a regulated savings account and satisfy identity checks.",
        requestedClaims: ["full_name", "verified_email", "country_of_residence"],
      },
      "https://kyc-pass.vercel.app",
    );

    expect(requirement.verifierName).toBe("Northstar Digital Bank");
    expect(requirement.verifierOrigin).toBe("https://northstar.example");
    expect(requirement.verifierUrl).toBe("https://northstar.example/api/kycpass/verifier");
    expect(requirement.requestedClaims).toEqual([
      "full_name",
      "verified_email",
      "country_of_residence",
    ]);
  });

  it("falls back to the KYCPass verifier origin for the co-hosted sample", () => {
    const requirement = buildPartnerRequirement(
      {
        partner: {
          id: "northstar-digital-bank",
          name: "Northstar Digital Bank",
          origin: "https://northstar.example",
        },
        purpose: "Open a regulated savings account and satisfy identity checks.",
        requestedClaims: ["full_name"],
      },
      "https://kyc-pass.vercel.app",
    );

    expect(requirement.verifierOrigin).toBe("https://kyc-pass.vercel.app");
    expect(requirement.verifierUrl).toBeUndefined();
  });
});
