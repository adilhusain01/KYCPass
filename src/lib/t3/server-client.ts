import "server-only";

import {
  T3nClient,
  createEthAuthInput,
  eth_get_address,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk";

import { getServerEnv } from "@/lib/env";

type AgentSession = {
  client: T3nClient;
  did: string;
};

let agentSessionPromise: Promise<AgentSession> | null = null;

export async function getAgentSession(): Promise<AgentSession> {
  if (agentSessionPromise) return agentSessionPromise;

  agentSessionPromise = (async () => {
    const env = getServerEnv();
    setEnvironment(env.T3N_ENVIRONMENT);
    const address = eth_get_address(env.T3N_API_KEY);
    const client = new T3nClient({
      wasmComponent: await loadWasmComponent(),
      handlers: {
        EthSign: metamask_sign(address, undefined, env.T3N_API_KEY),
      },
    });
    await client.handshake();
    const did = await client.authenticate(createEthAuthInput(address));
    if (did.value.toLowerCase() !== env.T3N_DEVELOPER_DID.toLowerCase()) {
      throw new Error("Authenticated Terminal 3 DID does not match T3N_DEVELOPER_DID.");
    }
    return { client, did: did.value };
  })().catch((error) => {
    agentSessionPromise = null;
    throw error;
  });

  return agentSessionPromise;
}

export async function invokeDisclosureContract(input: {
  userDid: string;
  requestId: string;
  verifierName: string;
  purpose: string;
  claims: string[];
}) {
  const env = getServerEnv();
  const { client } = await getAgentSession();
  const scriptName = `z:${env.T3N_DEVELOPER_DID.slice("did:t3n:".length)}:${env.T3N_CONTRACT_TAIL}`;

  return client.executeAndDecode({
    script_name: scriptName,
    script_version: env.T3N_CONTRACT_VERSION,
    function_name: "submit-kyc-proof",
    pii_did: input.userDid,
    input: {
      request_id: input.requestId,
      verifier_id: input.verifierName,
      purpose: input.purpose,
      verifier_url: `${env.NEXT_PUBLIC_VERIFIER_ORIGIN}/api/verifier/submit`,
      verifier_secret: env.KYCPASS_VERIFIER_SECRET,
      claims: input.claims,
    },
  });
}

export async function getAgentOverview() {
  const env = getServerEnv();
  const { client, did } = await getAgentSession();
  const [usage, audit] = await Promise.all([
    client.getUsage({ limit: 20 }),
    client.getAuditEvents({ limit: 30 }),
  ]);
  return {
    did,
    tenantDid: env.T3N_DEVELOPER_DID,
    contractTail: env.T3N_CONTRACT_TAIL,
    contractVersion: env.T3N_CONTRACT_VERSION,
    verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
    usage,
    audit,
  };
}
