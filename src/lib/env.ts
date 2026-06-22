import { z } from "zod";

const serverEnvSchema = z.object({
  T3N_API_KEY: z.string().min(32),
  T3N_DEVELOPER_DID: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
  T3N_ENVIRONMENT: z.enum(["testnet", "production"]).default("testnet"),
  T3N_CONTRACT_TAIL: z.string().default("kyc-disclosure"),
  T3N_CONTRACT_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
  NEXT_PUBLIC_VERIFIER_ORIGIN: z.string().url(),
  KYCPASS_VERIFIER_SECRET: z.string().min(24),
  KYCPASS_AGENT_ACCESS_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function isTeeReachableVerifierOrigin(origin: string) {
  const url = new URL(origin);
  return (
    url.protocol === "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
  );
}

export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  }
  return result.data;
}

export function getPublicConfig() {
  return {
    environment:
      process.env.NEXT_PUBLIC_T3N_ENVIRONMENT === "production" ? "production" : "testnet",
    verifierOrigin:
      process.env.NEXT_PUBLIC_VERIFIER_ORIGIN ?? "http://localhost:3000",
  } as const;
}
