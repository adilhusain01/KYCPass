import { afterEach, describe, expect, it } from "vitest";

import { AgentAuthenticationError, authenticateAgentRequest } from "@/lib/agent/auth";

const originalToken = process.env.KYCPASS_AGENT_ACCESS_TOKEN;

afterEach(() => {
  if (originalToken === undefined) delete process.env.KYCPASS_AGENT_ACCESS_TOKEN;
  else process.env.KYCPASS_AGENT_ACCESS_TOKEN = originalToken;
});

describe("agent API authentication", () => {
  it("accepts the configured bearer token", () => {
    process.env.KYCPASS_AGENT_ACCESS_TOKEN = "a".repeat(40);
    expect(() =>
      authenticateAgentRequest(
        new Request("https://kycpass.example/api/agent/v1/actions/disclose", {
          headers: { Authorization: `Bearer ${"a".repeat(40)}` },
        }),
      ),
    ).not.toThrow();
  });

  it("rejects invalid credentials without exposing the configured token", () => {
    process.env.KYCPASS_AGENT_ACCESS_TOKEN = "a".repeat(40);
    expect(() =>
      authenticateAgentRequest(
        new Request("https://kycpass.example/api/agent/v1/actions/disclose", {
          headers: { Authorization: `Bearer ${"b".repeat(40)}` },
        }),
      ),
    ).toThrow(AgentAuthenticationError);
  });
});
