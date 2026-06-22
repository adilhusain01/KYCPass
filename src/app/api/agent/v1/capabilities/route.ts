import { NextResponse } from "next/server";

import { getAgentCapabilities } from "@/lib/agent/capabilities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(getAgentCapabilities(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent capabilities unavailable." },
      { status: 503 },
    );
  }
}
