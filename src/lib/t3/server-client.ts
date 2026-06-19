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

function logAgentStage(stage: string, startedAt: number, details: Record<string, unknown> = {}) {
  console.info(
    `[KYCPass:T3 agent] ${stage} elapsed_ms=${Date.now() - startedAt} details=${JSON.stringify(details)}`,
  );
}

function getServerNodeUrl(env = getServerEnv()) {
  return `${env.NEXT_PUBLIC_VERIFIER_ORIGIN.replace(/\/$/, "")}/api/t3`;
}

function getDisclosureScriptName(env = getServerEnv()) {
  return `z:${env.T3N_DEVELOPER_DID.slice("did:t3n:".length)}:${env.T3N_CONTRACT_TAIL}`;
}

export async function resolveDisclosureContract() {
  const startedAt = Date.now();
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  const scriptName = getDisclosureScriptName(env);
  logAgentStage("disclosure contract version resolving", startedAt, { scriptName });
  const scriptVersion = await getScriptVersion(getServerNodeUrl(env), scriptName);
  logAgentStage("disclosure contract version resolved", startedAt, {
    scriptName,
    scriptVersion,
  });
  return {
    scriptName,
    scriptVersion,
    contractTail: env.T3N_CONTRACT_TAIL,
  };
}

export async function resolveUserContractVersion() {
  const startedAt = Date.now();
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  logAgentStage("user contract version resolving", startedAt);
  const scriptVersion = await getScriptVersion(getServerNodeUrl(env), "tee:user/contracts");
  logAgentStage("user contract version resolved", startedAt, { scriptVersion });
  return scriptVersion;
}

async function createAgentSession(timeoutMs: number): Promise<AgentSession> {
  const startedAt = Date.now();
  const env = getServerEnv();
  setEnvironment(env.T3N_ENVIRONMENT);
  const nodeUrl = getServerNodeUrl(env);
  logAgentStage("session init", startedAt, {
    nodeUrl,
    environment: env.T3N_ENVIRONMENT,
    timeoutMs,
  });
  const address = eth_get_address(env.T3N_API_KEY);
  const wasmStartedAt = Date.now();
  logAgentStage("wasm loading", startedAt);
  const wasmComponent = await loadWasmComponent();
  logAgentStage("wasm loaded", startedAt, { wasmElapsedMs: Date.now() - wasmStartedAt });
  const client = new T3nClient({
    baseUrl: nodeUrl,
    wasmComponent,
    timeout: timeoutMs,
    handlers: {
      EthSign: metamask_sign(address, undefined, env.T3N_API_KEY),
    },
  });
  logAgentStage("handshake started", startedAt);
  await client.handshake();
  logAgentStage("handshake completed", startedAt);
  logAgentStage("authenticate started", startedAt);
  const did = await client.authenticate(createEthAuthInput(address));
  logAgentStage("authenticate completed", startedAt, { did: did.value });
  if (did.value.toLowerCase() !== env.T3N_DEVELOPER_DID.toLowerCase()) {
    throw new Error("Authenticated Terminal 3 DID does not match T3N_DEVELOPER_DID.");
  }
  logAgentStage("session ready", startedAt, { did: did.value });
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

export async function getDisclosureAgentHealth() {
  const startedAt = Date.now();
  const { did } = await getDisclosureAgentSession();
  return {
    did,
    elapsedMs: Date.now() - startedAt,
  };
}

export async function invokeDisclosureContract(input: {
  userDid: string;
  requestId: string;
  verifierName: string;
  verifierOrigin: string;
  verifierUrl?: string;
  purpose: string;
  claims: string[];
}) {
  const startedAt = Date.now();
  const env = getServerEnv();
  console.info(
    `[KYCPass:Disclosure] agent session requested request=${input.requestId} details=${JSON.stringify({
      claims: input.claims,
      verifierName: input.verifierName,
      verifierOrigin: input.verifierOrigin,
      verifierUrl: input.verifierUrl ?? `${input.verifierOrigin}/api/verifier/submit`,
    })}`,
  );
  const { client } = await getDisclosureAgentSession();
  console.info(
    `[KYCPass:Disclosure] agent session ready request=${input.requestId} elapsed_ms=${Date.now() - startedAt}.`,
  );
  console.info(`[KYCPass:Disclosure] contract version resolving request=${input.requestId}.`);
  const { scriptName, scriptVersion } = await resolveDisclosureContract();
  console.info(
    `[KYCPass:Disclosure] contract execution dispatch request=${input.requestId} elapsed_ms=${Date.now() - startedAt} script=${scriptName}@${scriptVersion}.`,
  );

  const result = await client.executeAndDecode({
    script_name: scriptName,
    script_version: scriptVersion,
    function_name: "submit-kyc-proof",
    pii_did: input.userDid,
    input: {
      request_id: input.requestId,
      verifier_id: input.verifierName,
      purpose: input.purpose,
      verifier_url: input.verifierUrl ?? `${input.verifierOrigin}/api/verifier/submit`,
      verifier_secret: env.KYCPASS_VERIFIER_SECRET,
      claims: input.claims,
    },
  });
  console.info(
    `[KYCPass:Disclosure] contract execution returned request=${input.requestId} elapsed_ms=${Date.now() - startedAt}.`,
  );
  return result;
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
