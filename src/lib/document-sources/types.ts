import type { UserProfileInput } from "@/lib/domain";

export type DocumentSourceId = "uidai-offline-ekyc" | "digilocker";

export type VerifiedDocumentClaims = {
  source: DocumentSourceId;
  issuer: string;
  documentType: string;
  verifiedAt: string;
  validatedSourceFieldCount: number;
  mappedProfileFields: Array<keyof UserProfileInput>;
  profile: UserProfileInput;
};
