import { z } from "zod";

export const claimIds = [
  "full_name",
  "verified_email",
  "country_of_residence",
  "document_issuance_country",
  "address",
  "tax_identifier",
] as const;

export const claimIdSchema = z.enum(claimIds);
export type ClaimId = z.infer<typeof claimIdSchema>;

export const claimCatalog: Record<
  ClaimId,
  { label: string; description: string; placeholders: string[]; sensitivity: "low" | "medium" | "high" }
> = {
  full_name: {
    label: "Legal name",
    description: "First and last name from the protected T3 profile.",
    placeholders: ["profile.first_name", "profile.last_name"],
    sensitivity: "medium",
  },
  verified_email: {
    label: "Verified email",
    description: "Email address proven through the Terminal 3 OTP flow.",
    placeholders: ["profile.verified_contacts.email.value"],
    sensitivity: "medium",
  },
  country_of_residence: {
    label: "Country of residence",
    description: "Current country of residence.",
    placeholders: ["profile.country_of_residence"],
    sensitivity: "low",
  },
  document_issuance_country: {
    label: "Document country",
    description: "Country that issued the identity document.",
    placeholders: ["profile.document_issuance_country"],
    sensitivity: "low",
  },
  address: {
    label: "Residential address",
    description: "Full residential address.",
    placeholders: ["profile.address"],
    sensitivity: "high",
  },
  tax_identifier: {
    label: "US SSN",
    description: "Optional US Social Security number stored in the Terminal 3 profile SSN field.",
    placeholders: ["profile.ssn"],
    sensitivity: "high",
  },
};

export const requirementSchema = z.object({
  id: z.string().min(3).max(100),
  verifierName: z.string().min(2).max(100),
  verifierOrigin: z.string().url(),
  purpose: z.string().min(10).max(300),
  requestedClaims: z.array(claimIdSchema).min(1).max(claimIds.length),
  expiresAt: z.string().datetime(),
  returnPath: z.enum(["/northstar"]).optional(),
});
export type KycRequirement = z.infer<typeof requirementSchema>;

export const disclosurePlanSchema = z.object({
  requirementId: z.string(),
  claims: z.array(claimIdSchema).min(1),
  placeholders: z.array(z.string()).min(1),
  rejectedClaims: z.array(z.string()),
});
export type DisclosurePlan = z.infer<typeof disclosurePlanSchema>;

export const disclosureRequestSchema = z.object({
  requestId: z.string().uuid(),
  userDid: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
  requirement: requirementSchema,
  approvedClaims: z.array(claimIdSchema).min(1),
});
export type DisclosureRequest = z.infer<typeof disclosureRequestSchema>;

export const contractSubmissionSchema = z.object({
  request_id: z.string().uuid(),
  verifier_id: z.string().min(2).max(100),
  purpose: z.string().min(10).max(300),
  claims: z.record(z.string(), z.unknown()),
});

export const receiptSchema = z.object({
  receiptId: z.string().uuid(),
  requestId: z.string().uuid(),
  verifier: z.string(),
  status: z.literal("accepted"),
  kycLevel: z.literal("t3n.user-input.kyc.1"),
  disclosedClaims: z.array(claimIdSchema),
  verifiedAt: z.string().datetime(),
});
export type DisclosureReceipt = z.infer<typeof receiptSchema>;

export const userProfileSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  country_of_residence: z.string().length(2).toUpperCase(),
  document_issuance_country: z.string().length(2).toUpperCase(),
  address: z.string().min(8).max(240),
  ssn: z.union([
    z.literal(""),
    z
      .string()
      .regex(
        /^(?:\d{9}|\d{3}-\d{2}-\d{4})$/,
        "Enter a 9-digit US SSN, formatted as 123456789 or 123-45-6789, or leave it blank.",
      ),
  ]),
});
export type UserProfileInput = z.infer<typeof userProfileSchema>;

export function buildTerminalUserProfile(profile: UserProfileInput) {
  const { ssn, ...requiredProfile } = profile;
  return {
    ...requiredProfile,
    ...(ssn ? { ssn } : {}),
  };
}

export const otpRequestSchema = z.object({ email: z.string().email() });
export const otpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
});
