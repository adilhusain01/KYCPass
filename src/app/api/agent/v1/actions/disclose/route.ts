import { NextResponse } from "next/server";

import { agentDisclosureActionSchema } from "@/lib/agent/actions";
import { AgentAuthenticationError, authenticateAgentRequest } from "@/lib/agent/auth";
import { getAgentCapabilities } from "@/lib/agent/capabilities";
import {
  executeDisclosureRequest,
  summarizeDisclosureError,
} from "@/lib/disclosure/server-execution";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const startedAt = Date.now();
  let invocationId = "unparsed";
  try {
    authenticateAgentRequest(request);
    const action = agentDisclosureActionSchema.parse(await request.json());
    invocationId = action.invocationId;
    console.info(
      `[KYCPass:Agent API] accepted invocation=${invocationId} action=${action.action}.`,
    );

    const receipt = await executeDisclosureRequest(action.request, {
      source: "agent-api",
      invocationId,
    });
    return NextResponse.json({
      invocationId,
      agentDid: getAgentCapabilities().agentDid,
      status: "completed",
      receipt,
    });
  } catch (error) {
    const status = error instanceof AgentAuthenticationError ? error.status : 400;
    console.error(
      `[KYCPass:Agent API] failed invocation=${invocationId} elapsed_ms=${Date.now() - startedAt} details=${JSON.stringify(summarizeDisclosureError(error))}`,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent action failed." },
      { status },
    );
  }
}
