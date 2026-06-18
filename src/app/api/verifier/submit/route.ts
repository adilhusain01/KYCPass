import { randomUUID, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { contractSubmissionSchema, receiptSchema } from "@/lib/domain";
import { getServerEnv } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const env = getServerEnv();
    const suppliedSecret = request.headers.get("x-kycpass-contract-secret") ?? "";
    const expected = Buffer.from(env.KYCPASS_VERIFIER_SECRET);
    const supplied = Buffer.from(suppliedSecret);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
      return NextResponse.json({ error: "Unauthorized contract submission." }, { status: 401 });
    }

    const submission = contractSubmissionSchema.parse(await request.json());
    const disclosedClaims = Object.keys(submission.claims);
    const receipt = receiptSchema.parse({
      receiptId: randomUUID(),
      requestId: submission.request_id,
      verifier: submission.verifier_id,
      status: "accepted",
      kycLevel: "t3n.user-input.kyc.1",
      disclosedClaims,
      verifiedAt: new Date().toISOString(),
    });

    return NextResponse.json(receipt, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verifier rejected submission." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

