import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";
import {
  T3nClient,
  TenantClient,
  createEthAuthInput,
  eth_get_address,
  getNodeUrl,
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
    })
    .parse(process.env);

  setEnvironment(env.T3N_ENVIRONMENT);
  const address = eth_get_address(env.T3N_API_KEY);
  const client = new T3nClient({
    wasmComponent: await loadWasmComponent(),
    handlers: { EthSign: metamask_sign(address, undefined, env.T3N_API_KEY) },
  });
  await client.handshake();
  const authenticatedDid = await client.authenticate(createEthAuthInput(address));
  if (authenticatedDid.value.toLowerCase() !== env.T3N_DEVELOPER_DID.toLowerCase()) {
    throw new Error("Authenticated DID does not match T3N_DEVELOPER_DID.");
  }

  const tenant = new TenantClient({
    environment: env.T3N_ENVIRONMENT,
    endpoint: getNodeUrl(),
    baseUrl: getNodeUrl(),
    tenantDid: env.T3N_DEVELOPER_DID,
    t3n: client,
  });

  try {
    await tenant.tenant.me();
  } catch {
    await tenant.tenant.claim();
  }

  const wasmPath = resolve(
    "contracts/kyc-disclosure/target/wasm32-wasip2/release/kyc_disclosure.wasm",
  );
  const wasm = await readFile(wasmPath);
  const result = await tenant.contracts.register({
    tail: env.T3N_CONTRACT_TAIL,
    version: env.T3N_CONTRACT_VERSION,
    wasm,
  });

  console.log(
    JSON.stringify(
      {
        contract: tenant.canonicalName(env.T3N_CONTRACT_TAIL),
        version: env.T3N_CONTRACT_VERSION,
        environment: env.T3N_ENVIRONMENT,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Contract deployment failed.");
  process.exitCode = 1;
});
