import { loadEnvConfig } from "@next/env";
import {
  T3nClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
  getScriptVersion,
  loadWasmComponent,
  metamask_sign,
  setEnvironment,
} from "@terminal3/t3n-sdk";
import { z } from "zod";

async function main() {
  loadEnvConfig(process.cwd());
  const env = z
    .object({
      T3N_API_KEY: z.string().min(32),
      T3N_DEVELOPER_DID: z.string().regex(/^did:t3n:[0-9a-f]{40}$/i),
      T3N_ENVIRONMENT: z.enum(["testnet", "production"]).default("testnet"),
      T3N_CONTRACT_TAIL: z.string().default("kyc-disclosure"),
      T3N_CONTRACT_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
      NEXT_PUBLIC_VERIFIER_ORIGIN: z.string().url(),
    })
    .parse(process.env);

  setEnvironment(env.T3N_ENVIRONMENT);
  const address = eth_get_address(env.T3N_API_KEY);
  const client = new T3nClient({
    wasmComponent: await loadWasmComponent(),
    handlers: { EthSign: metamask_sign(address, undefined, env.T3N_API_KEY) },
  });
  await client.handshake();
  const did = await client.authenticate(createEthAuthInput(address));
  if (did.value.toLowerCase() !== env.T3N_DEVELOPER_DID.toLowerCase()) {
    throw new Error("Authenticated DID does not match the configured developer DID.");
  }

  const scriptName = `z:${env.T3N_DEVELOPER_DID.slice("did:t3n:".length)}:${env.T3N_CONTRACT_TAIL}`;
  const [scriptVersion, usage, audit] = await Promise.all([
    getScriptVersion(getNodeUrl(), scriptName),
    client.getUsage({ limit: 5 }),
    client.getAuditEvents({ limit: 5 }),
  ]);

  const auditRecord = audit as unknown as Record<string, unknown>;
  const usageRecord = usage as unknown as Record<string, unknown>;
  const auditBatches = Array.isArray(auditRecord.batches) ? auditRecord.batches : [];
  const committedBatchEntries = auditBatches.flatMap((candidate) => {
    const batch = candidate as Record<string, unknown>;
    return batch.committed === true && Array.isArray(batch.events) ? batch.events : [];
  });
  const auditEntries =
    committedBatchEntries.length > 0
      ? committedBatchEntries
      : Array.isArray(auditRecord.events)
        ? auditRecord.events
        : Array.isArray(auditRecord.entries)
          ? auditRecord.entries
          : [];
  const usageEntries = Array.isArray(usageRecord.entries) ? usageRecord.entries : [];
  const verifierUrl = new URL(env.NEXT_PUBLIC_VERIFIER_ORIGIN);
  const verifierTeeReachable =
    verifierUrl.protocol === "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(verifierUrl.hostname.toLowerCase());

  console.log(
    JSON.stringify(
      {
        authenticated: true,
        didMatches: true,
        environment: env.T3N_ENVIRONMENT,
        scriptName,
        scriptVersion,
        expectedScriptVersion: env.T3N_CONTRACT_VERSION,
        scriptVersionMatches: scriptVersion === env.T3N_CONTRACT_VERSION,
        verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
        verifierTeeReachable,
        auditEntries: auditEntries.length,
        usageEntries: usageEntries.length,
        balanceAvailable:
          "balance" in usageRecord || "current_balance" in usageRecord,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Terminal 3 check failed.");
  process.exitCode = 1;
});
