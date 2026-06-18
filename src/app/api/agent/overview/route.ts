import { NextResponse } from "next/server";

import { getAgentOverview } from "@/lib/t3/server-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getAgentOverview(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent overview unavailable." },
      { status: 503 },
    );
  }
}

