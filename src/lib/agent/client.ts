import { z } from "zod";

import { agentDisclosureActionSchema, type AgentDisclosureAction } from "@/lib/agent/actions";
import { claimIdSchema, receiptSchema, requirementSchema, type ClaimId } from "@/lib/domain";

const agentActionResultSchema = z.object({
  invocationId: z.string().uuid(),
  agentDid: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
  status: z.literal("completed"),
  receipt: receiptSchema,
});

export type AgentActionResult = z.infer<typeof agentActionResultSchema>;

const partnerRequirementResponseSchema = z.object({
  requirement: requirementSchema,
});

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : {};
  } catch {
    throw new Error(`KYCPass returned a non-JSON response with HTTP ${response.status}.`);
  }
}

export async function fetchAgentCapabilities(origin: string) {
  const response = await fetch(`${normalizeOrigin(origin)}/api/agent/v1/capabilities`, {
    headers: { Accept: "application/json" },
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? "KYCPass capabilities unavailable.");
  }
  return body;
}

export async function createAgentDisclosureRequirement(
  origin: string,
  input: {
    verifierName: string;
    purpose: string;
    requestedClaims: ClaimId[];
  },
) {
  const response = await fetch(`${normalizeOrigin(origin)}/api/partners/kyc-request`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      partner: {
        id: "mcp-agent",
        name: input.verifierName,
      },
      purpose: input.purpose,
      requestedClaims: z.array(claimIdSchema).min(1).parse(input.requestedClaims),
    }),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? "KYCPass request creation failed.");
  }
  return partnerRequirementResponseSchema.parse(body).requirement;
}

export async function submitAgentDisclosure(
  origin: string,
  token: string,
  action: AgentDisclosureAction,
): Promise<AgentActionResult> {
  const parsedAction = agentDisclosureActionSchema.parse(action);
  const response = await fetch(`${normalizeOrigin(origin)}/api/agent/v1/actions/disclose`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsedAction),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? "KYCPass agent action failed.");
  }
  return agentActionResultSchema.parse(body);
}
