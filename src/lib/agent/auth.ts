import "server-only";

import { timingSafeEqual } from "node:crypto";

export class AgentAuthenticationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 503,
  ) {
    super(message);
    this.name = "AgentAuthenticationError";
  }
}

function equalTokens(received: string, expected: string) {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
}

export function authenticateAgentRequest(request: Request) {
  const expected = process.env.KYCPASS_AGENT_ACCESS_TOKEN;
  if (!expected) {
    throw new AgentAuthenticationError("Agent Action API is not configured.", 503);
  }

  const authorization = request.headers.get("authorization");
  const received = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!received || !equalTokens(received, expected)) {
    throw new AgentAuthenticationError("Invalid agent bearer token.", 401);
  }
}
