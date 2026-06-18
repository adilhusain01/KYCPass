import "server-only";

import {
  T3nClient,
  createEthAuthInput,
  eth_get_address,
  getScriptVersion,
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
const DEFAULT_AGENT_TIMEOUT_MS = 15_000;
const DISCLOSURE_AGENT_TIMEOUT_MS = 105_000;

function getServerNodeUrl(env = getServerEnv()) {
  return `${env.NEXT_PUBLIC_VERIFIER_ORIGIN.replace(/\/$/, "")}/api/t3`;
}

function getDisclosureScriptName(env = getServerEnv()) {
  return `z:${env.T3N_DEVELOPER_DID.slice("did:t3n:".length)}:${env.T3N_CONTRACT_TAIL}`;
}

export async function resolveDisclosureContract() {
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  const scriptName = getDisclosureScriptName(env);
  const scriptVersion = await getScriptVersion(getServerNodeUrl(env), scriptName);
  return {
    scriptName,
    scriptVersion,
    contractTail: env.T3N_CONTRACT_TAIL,
  };
}

export async function resolveUserContractVersion() {
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  return getScriptVersion(getServerNodeUrl(env), "tee:user/contracts");
}

async function createAgentSession(timeoutMs: number): Promise<AgentSession> {
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  const nodeUrl = getServerNodeUrl(env);
  console.info(`[KYCPass:T3 agent] session init via ${nodeUrl}.`);
  const address = eth_get_address(env.T3N_API_KEY);
  console.info("[KYCPass:T3 agent] loading wasm component.");
  const client = new T3nClient({
    baseUrl: nodeUrl,
    wasmComponent: await loadWasmComponent(),
    timeout: timeoutMs,
    handlers: {
      EthSign: metamask_sign(address, undefined, env.T3N_API_KEY),
    },
  });
  console.info("[KYCPass:T3 agent] handshake started.");
  await client.handshake();
  console.info("[KYCPass:T3 agent] handshake completed.");
  console.info("[KYCPass:T3 agent] authenticate started.");
  const did = await client.authenticate(createEthAuthInput(address));
  console.info("[KYCPass:T3 agent] authenticate completed.");
  if (did.value.toLowerCase() !== env.T3N_DEVELOPER_DID.toLowerCase()) {
    throw new Error("Authenticated Terminal 3 DID does not match T3N_DEVELOPER_DID.");
  }
  return { client, did: did.value };
}

export async function getAgentSession(): Promise<AgentSession> {
  if (agentSessionPromise) return agentSessionPromise;

  agentSessionPromise = createAgentSession(DEFAULT_AGENT_TIMEOUT_MS).catch((error) => {
    agentSessionPromise = null;
    throw error;
  });

  return agentSessionPromise;
}

async function getDisclosureAgentSession(): Promise<AgentSession> {
  return createAgentSession(DISCLOSURE_AGENT_TIMEOUT_MS);
}

export async function invokeDisclosureContract(input: {
  userDid: string;
  requestId: string;
  verifierName: string;
  purpose: string;
  claims: string[];
}) {
  const env = getServerEnv();
  console.info(`[KYCPass:Disclosure] agent session requested request=${input.requestId}.`);
  const { client } = await getDisclosureAgentSession();
  console.info(`[KYCPass:Disclosure] contract version resolving request=${input.requestId}.`);
  const { scriptName, scriptVersion } = await resolveDisclosureContract();
  console.info(
    `[KYCPass:Disclosure] contract execution dispatch request=${input.requestId} script=${scriptName}@${scriptVersion}.`,
  );

  return client.executeAndDecode({
    script_name: scriptName,
    script_version: scriptVersion,
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
  const [usage, audit, contract] = await Promise.all([
    client.getUsage({ limit: 20 }),
    client.getAuditEvents({ limit: 30 }),
    resolveDisclosureContract(),
  ]);
  return {
    did,
    tenantDid: env.T3N_DEVELOPER_DID,
    contractTail: env.T3N_CONTRACT_TAIL,
    contractVersion: contract.scriptVersion,
    verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
    usage,
    audit,
  };
}
