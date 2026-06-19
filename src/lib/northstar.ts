import type { ClaimId } from "@/lib/domain";
import { hasReceiptForClaims } from "@/lib/partner-verification";

export const NORTHSTAR_ID = "northstar-digital-bank";
export const NORTHSTAR_NAME = "Northstar Digital Bank";
export const NORTHSTAR_CLAIMS: ClaimId[] = [
  "full_name",
  "verified_email",
  "country_of_residence",
];
export const NORTHSTAR_PURPOSE =
  "Open a regulated savings account and satisfy customer identity checks.";

export function isNorthstarReceipt(receipt: {
  verifier: string;
  disclosedClaims: ClaimId[];
} | null) {
  return hasReceiptForClaims(receipt, NORTHSTAR_NAME, NORTHSTAR_CLAIMS);
}
