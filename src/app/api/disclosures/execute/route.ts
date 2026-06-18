import { NextResponse } from "next/server";

import { assertDisclosureRequestBinding, assertMinimumDisclosure } from "@/lib/disclosure-policy";
import { disclosureRequestSchema, receiptSchema } from "@/lib/domain";
import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";
import { invokeDisclosureContract } from "@/lib/t3/server-client";

export async function POST(request: Request) {
  try {
    const body = disclosureRequestSchema.parse(await request.json());
    const env = getServerEnv();
    if (!isTeeReachableVerifierOrigin(env.NEXT_PUBLIC_VERIFIER_ORIGIN)) {
      throw new Error("TEE disclosure requires a public HTTPS verifier origin.");
    }
    assertDisclosureRequestBinding(body.requirement, env.NEXT_PUBLIC_VERIFIER_ORIGIN);
    const approvedClaims = assertMinimumDisclosure(body.requirement, body.approvedClaims);
    const result = await invokeDisclosureContract({
      userDid: body.userDid,
      requestId: body.requestId,
      verifierName: body.requirement.verifierName,
      purpose: body.requirement.purpose,
      claims: approvedClaims,
    });
    return NextResponse.json(receiptSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disclosure execution failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
