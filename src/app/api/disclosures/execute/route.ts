import { NextResponse } from "next/server";

import { corsHeaders, withCors } from "@/lib/cors";
import {
  executeDisclosureRequest,
  summarizeDisclosureError,
} from "@/lib/disclosure/server-execution";
import { getDisclosureAgentHealth } from "@/lib/t3/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    console.info("[KYCPass:Disclosure] health probe started.");
    const health = await withTimeout(
      getDisclosureAgentHealth(),
      25_000,
      "Disclosure route agent health probe timed out before Terminal 3 authenticated the server agent.",
    );
    console.info(
      `[KYCPass:Disclosure] health probe succeeded elapsed_ms=${Date.now() - startedAt}.`,
    );
    return NextResponse.json({
      ok: true,
      route: "/api/disclosures/execute",
      ...health,
    }, { headers: withCors(request) });
  } catch (error) {
    console.error(
      `[KYCPass:Disclosure] health probe failed elapsed_ms=${Date.now() - startedAt}: ${JSON.stringify(summarizeDisclosureError(error))}`,
    );
    return NextResponse.json(
      {
        ok: false,
        route: "/api/disclosures/execute",
        error: error instanceof Error ? error.message : "Disclosure route health probe failed.",
      },
      { status: 503, headers: withCors(request) },
    );
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestId = "unparsed";
  try {
    console.info("[KYCPass:Disclosure] request body parsing started.");
    const input = await request.json();
    if (input && typeof input === "object" && "requestId" in input) {
      requestId = String(input.requestId);
    }
    const receipt = await executeDisclosureRequest(input, { source: "browser" });
    return NextResponse.json(receipt, { headers: withCors(request) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disclosure execution failed.";
    console.error(
      `[KYCPass:Disclosure] invoke failed request=${requestId} elapsed_ms=${Date.now() - startedAt}: ${JSON.stringify(summarizeDisclosureError(error))}`,
    );
    return NextResponse.json({ error: message }, { status: 400, headers: withCors(request) });
  }
}
