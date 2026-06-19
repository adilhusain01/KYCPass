import { z } from "zod";

import {
  claimIdSchema,
  requirementSchema,
  type ClaimId,
  type DisclosureReceipt,
  type KycRequirement,
} from "@/lib/domain";

export const partnerVerificationRequestSchema = z.object({
  partner: z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,60}$/),
    name: z.string().min(2).max(100),
    origin: z.string().url().optional(),
    verifierUrl: z.string().url().optional(),
  }),
  purpose: z.string().min(10).max(300),
  requestedClaims: z.array(claimIdSchema).min(1).max(6),
  returnPath: z.enum(["/northstar"]).optional(),
});

export type PartnerVerificationRequest = z.infer<typeof partnerVerificationRequestSchema>;

export function buildPartnerRequirement(
  request: PartnerVerificationRequest,
  verifierOrigin: string,
): KycRequirement {
  const verifierUrl = request.partner.verifierUrl;
  const resolvedVerifierOrigin = verifierUrl ? new URL(verifierUrl).origin : verifierOrigin;

  return requirementSchema.parse({
    id: `${request.partner.id}-${crypto.randomUUID()}`,
    verifierName: request.partner.name,
    verifierOrigin: resolvedVerifierOrigin,
    ...(verifierUrl ? { verifierUrl } : {}),
    purpose: request.purpose,
    requestedClaims: [...new Set(request.requestedClaims)],
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    returnPath: request.returnPath,
  });
}

export function hasReceiptForClaims(
  receipt: Pick<DisclosureReceipt, "verifier" | "disclosedClaims"> | null,
  verifierName: string,
  claims: ClaimId[],
) {
  return Boolean(
    receipt &&
      receipt.verifier === verifierName &&
      claims.every((claim) => receipt.disclosedClaims.includes(claim)),
  );
}
