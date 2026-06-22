import "server-only";

import { claimCatalog, claimIds } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";

export function getAgentCapabilities() {
  const env = getServerEnv();
  return {
    schemaVersion: "1.0",
    name: "KYCPass Disclosure Agent",
    description:
      "Executes user-authorized KYC claim disclosures without exposing protected values to the calling AI agent.",
    agentDid: env.T3N_DEVELOPER_DID,
    environment: env.T3N_ENVIRONMENT,
    authentication: {
      type: "bearer",
      header: "Authorization",
    },
    action: {
      id: "kyc.disclose",
      endpoint: "/api/agent/v1/actions/disclose",
      contract: `${env.T3N_CONTRACT_TAIL}@${env.T3N_CONTRACT_VERSION}`,
      function: "submit-kyc-proof",
      authorization:
        "A prior user-signed Terminal 3 grant must bind this agent DID, contract, function, and verifier host.",
      returns: "Sanitized verifier receipt only",
    },
    claims: claimIds.map((id) => ({
      id,
      label: claimCatalog[id].label,
      sensitivity: claimCatalog[id].sensitivity,
    })),
    safety: {
      userPrivateKeyRequired: false,
      plaintextPiiReturnedToAgent: false,
      terminal3EnforcedGrant: true,
      auditable: true,
    },
  } as const;
}
