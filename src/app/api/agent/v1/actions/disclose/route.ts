import { NextResponse } from "next/server";

import { agentDisclosureActionSchema } from "@/lib/agent/actions";
import { AgentAuthenticationError, authenticateAgentRequest } from "@/lib/agent/auth";
import { getAgentCapabilities } from "@/lib/agent/capabilities";
import {
  executeDisclosureRequest,
  summarizeDisclosureError,
} from "@/lib/disclosure/server-execution";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function agentActionFailure(error: unknown) {
  if (error instanceof AgentAuthenticationError) {
    return { status: error.status, body: { error: error.message } };
  }

  const message = error instanceof Error ? error.message : "Agent action failed.";
  if (/egress denied/i.test(message)) {
    const authorizationUrl = `${getServerEnv().NEXT_PUBLIC_VERIFIER_ORIGIN.replace(/\/$/, "")}/northstar`;
    return {
      status: 403,
      body: {
        code: "grant_egress_denied",
        error:
          "The user's Terminal 3 grant does not currently authorize the configured verifier host. Open the authorization URL with the same MetaMask identity, approve the scoped grant, then retry the agent action.",
        authorizationUrl,
      },
    };
  }

  return { status: 400, body: { error: message } };
}

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
    const failure = agentActionFailure(error);
    console.error(
      `[KYCPass:Agent API] failed invocation=${invocationId} elapsed_ms=${Date.now() - startedAt} details=${JSON.stringify(summarizeDisclosureError(error))}`,
    );
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
