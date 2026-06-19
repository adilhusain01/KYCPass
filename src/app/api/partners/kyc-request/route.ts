import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  buildPartnerRequirement,
  partnerVerificationRequestSchema,
} from "@/lib/partner-verification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = partnerVerificationRequestSchema.parse(await request.json());
    const env = getServerEnv();
    const requirement = buildPartnerRequirement(body, env.NEXT_PUBLIC_VERIFIER_ORIGIN);

    return NextResponse.json({
      requirement,
      adapter: {
        provider: "KYCPass",
        credential: "t3n.user-input.kyc.1",
        mode: "embedded",
        storesRawPii: false,
        disclosure: "terminal3-tee",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Partner verification request could not be created.",
      },
      { status: 400 },
    );
  }
}
