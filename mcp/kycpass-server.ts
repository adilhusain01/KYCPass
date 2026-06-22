import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { agentDisclosureActionSchema } from "../src/lib/agent/actions";
import { fetchAgentCapabilities, submitAgentDisclosure } from "../src/lib/agent/client";

const apiOrigin = process.env.KYCPASS_API_ORIGIN;
const accessToken = process.env.KYCPASS_AGENT_ACCESS_TOKEN;

if (!apiOrigin) throw new Error("KYCPASS_API_ORIGIN is required.");
if (!accessToken) throw new Error("KYCPASS_AGENT_ACCESS_TOKEN is required.");

const server = new McpServer(
  { name: "kycpass-agent", version: "0.1.0" },
  {
    instructions:
      "Use kycpass_get_capabilities before requesting a disclosure. Never ask for or transmit a user wallet private key, OTP, source document, or raw profile value. kycpass_disclose succeeds only when the user has already granted the KYCPass Terminal 3 agent access to the exact contract function and verifier host.",
  },
);

server.registerTool(
  "kycpass_get_capabilities",
  {
    title: "Get KYCPass agent capabilities",
    description:
      "Returns the verifiable Terminal 3 agent DID, supported KYC claims, action endpoint, contract boundary, and privacy guarantees.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async () => {
    const capabilities = await fetchAgentCapabilities(apiOrigin);
    return {
      content: [{ type: "text", text: JSON.stringify(capabilities, null, 2) }],
      structuredContent: capabilities as Record<string, unknown>,
    };
  },
);

server.registerTool(
  "kycpass_disclose",
  {
    title: "Execute a protected KYC disclosure",
    description:
      "Invokes the KYCPass did:t3n agent after validating the exact claim set. Terminal 3 must find a prior user-signed grant for the contract function and verifier host. Returns only a sanitized receipt.",
    inputSchema: agentDisclosureActionSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (action) => {
    try {
      const result = await submitAgentDisclosure(apiOrigin, accessToken, action);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : "KYCPass disclosure failed.",
          },
        ],
      };
    }
  },
);

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "KYCPass MCP server failed to start.");
  process.exitCode = 1;
});
