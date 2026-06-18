import {
  claimCatalog,
  claimIdSchema,
  disclosurePlanSchema,
  type ClaimId,
  type DisclosurePlan,
  type KycRequirement,
} from "@/lib/domain";

export function createDisclosurePlan(requirement: KycRequirement): DisclosurePlan {
  const uniqueClaims = [...new Set(requirement.requestedClaims)];
  const claims: ClaimId[] = [];
  const rejectedClaims: string[] = [];

  for (const candidate of uniqueClaims) {
    const parsed = claimIdSchema.safeParse(candidate);
    if (parsed.success) claims.push(parsed.data);
    else rejectedClaims.push(String(candidate));
  }

  return disclosurePlanSchema.parse({
    requirementId: requirement.id,
    claims,
    placeholders: claims.flatMap((claim) => claimCatalog[claim].placeholders),
    rejectedClaims,
  });
}

export function buildPlaceholderClaims(claims: ClaimId[]): Record<string, unknown> {
  const selected = new Set(claims);
  const result: Record<string, unknown> = {};

  if (selected.has("full_name")) {
    result.full_name = {
      first_name: "{{profile.first_name}}",
      last_name: "{{profile.last_name}}",
    };
  }
  if (selected.has("verified_email")) {
    result.verified_email = "{{profile.verified_contacts.email.value}}";
  }
  if (selected.has("country_of_residence")) {
    result.country_of_residence = "{{profile.country_of_residence}}";
  }
  if (selected.has("document_issuance_country")) {
    result.document_issuance_country = "{{profile.document_issuance_country}}";
  }
  if (selected.has("address")) {
    result.address = "{{profile.address}}";
  }
  if (selected.has("tax_identifier")) {
    result.tax_identifier = "{{profile.ssn}}";
  }

  return result;
}

export function assertMinimumDisclosure(
  requirement: KycRequirement,
  approvedClaims: ClaimId[],
): ClaimId[] {
  const required = new Set(requirement.requestedClaims);
  const approved = [...new Set(approvedClaims)];
  if (approved.some((claim) => !required.has(claim))) {
    throw new Error("Approval contains claims the verifier did not request.");
  }
  if (approved.length !== required.size) {
    throw new Error("All required claims must be approved or the request must be rejected.");
  }
  return [...required];
}

export function assertDisclosureRequestBinding(
  requirement: KycRequirement,
  configuredVerifierOrigin: string,
  now = new Date(),
) {
  if (new URL(requirement.verifierOrigin).origin !== new URL(configuredVerifierOrigin).origin) {
    throw new Error("Disclosure request verifier origin does not match the configured verifier.");
  }
  if (new Date(requirement.expiresAt).getTime() <= now.getTime()) {
    throw new Error("Disclosure request has expired.");
  }
}
