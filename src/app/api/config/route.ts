import { NextResponse } from "next/server";

import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const env = getServerEnv();
    return NextResponse.json({
      agentDid: env.T3N_DEVELOPER_DID,
      tenantDid: env.T3N_DEVELOPER_DID,
      environment: env.T3N_ENVIRONMENT,
      contractTail: env.T3N_CONTRACT_TAIL,
      contractVersion: env.T3N_CONTRACT_VERSION,
      verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
      verifierTeeReachable: isTeeReachableVerifierOrigin(env.NEXT_PUBLIC_VERIFIER_ORIGIN),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Configuration unavailable." },
      { status: 503 },
    );
  }
}
