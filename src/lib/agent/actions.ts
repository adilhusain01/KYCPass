import { z } from "zod";

import { disclosureRequestSchema } from "@/lib/domain";

export const agentDisclosureActionSchema = z.object({
  action: z.literal("kyc.disclose"),
  invocationId: z.string().uuid(),
  request: disclosureRequestSchema,
});

export type AgentDisclosureAction = z.infer<typeof agentDisclosureActionSchema>;
