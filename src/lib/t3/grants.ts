import { z } from "zod";

const grantInputSchema = z.object({
  agentDid: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
  tenantDid: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
  contractTail: z.string().min(1),
  contractVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  verifierHost: z.string().min(1).refine((value) => !value.includes("/"), {
    message: "Verifier host must not contain a path.",
  }),
});

export type DisclosureGrantInput = z.infer<typeof grantInputSchema>;

export function buildDisclosureGrant(rawInput: DisclosureGrantInput) {
  const input = grantInputSchema.parse(rawInput);
  return {
    agents: [
      {
        agentDid: input.agentDid,
        scripts: [
          {
            scriptName: `z:${input.tenantDid.slice("did:t3n:".length)}:${input.contractTail}`,
            versionReq: input.contractVersion,
            functions: ["submit-kyc-proof"],
            allowedHosts: [input.verifierHost],
          },
        ],
      },
    ],
  };
}
