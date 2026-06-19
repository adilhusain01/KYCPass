import { NextResponse } from "next/server";

import { corsHeaders, withCors } from "@/lib/cors";
import { getServerEnv } from "@/lib/env";
import {
  buildPartnerRequirement,
  partnerVerificationRequestSchema,
} from "@/lib/partner-verification";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    const body = partnerVerificationRequestSchema.parse(await request.json());
    const env = getServerEnv();
    const requirement = buildPartnerRequirement(body, env.NEXT_PUBLIC_VERIFIER_ORIGIN);

    return NextResponse.json(
      {
        requirement,
        adapter: {
          provider: "KYCPass",
          credential: "t3n.user-input.kyc.1",
          mode: "embedded",
          storesRawPii: false,
          disclosure: "terminal3-tee",
        },
      },
      { headers: withCors(request) },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Partner verification request could not be created.",
      },
      { status: 400, headers: withCors(request) },
    );
  }
}
