import { NextResponse } from "next/server";

import { corsHeaders, withCors } from "@/lib/cors";
import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";
import { resolveDisclosureContract, resolveUserContractVersion } from "@/lib/t3/server-client";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, "GET,OPTIONS") });
}

export async function GET(request: Request) {
  try {
    const env = getServerEnv();
    const [contract, userContractVersion] = await Promise.all([
      resolveDisclosureContract(),
      resolveUserContractVersion(),
    ]);
    return NextResponse.json(
      {
        agentDid: env.T3N_DEVELOPER_DID,
        tenantDid: env.T3N_DEVELOPER_DID,
        environment: env.T3N_ENVIRONMENT,
        contractTail: env.T3N_CONTRACT_TAIL,
        contractVersion: contract.scriptVersion,
        userContractVersion,
        verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
        verifierTeeReachable: isTeeReachableVerifierOrigin(env.NEXT_PUBLIC_VERIFIER_ORIGIN),
      },
      { headers: withCors(request) },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuration unavailable." },
      { status: 503, headers: withCors(request) },
    );
  }
}
