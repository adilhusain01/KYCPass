import { NextResponse } from "next/server";

import {
  extractAffinityCookie,
  getAllowedT3Path,
  getT3NodeOrigin,
  rewriteAffinityCookie,
} from "@/lib/t3/proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function copyRequestHeaders(request: Request) {
  const headers = new Headers();
  for (const name of ["accept", "content-type", "session-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const affinityCookie = extractAffinityCookie(request.headers.get("cookie"));
  if (affinityCookie) headers.set("cookie", affinityCookie);
  return headers;
}

function copyResponseHeaders(upstream: Response) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-type", "session-id", "x-request-id"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const affinityCookie = rewriteAffinityCookie(upstream.headers.get("set-cookie"));
  if (affinityCookie) headers.set("set-cookie", affinityCookie);
  return headers;
}

async function relay(request: Request, context: RouteContext) {
  const requestPath = new URL(request.url).pathname.replace(/^\/api\/t3\/?/, "");
  try {
    const path = getAllowedT3Path(request.method, (await context.params).path);
    const requestUrl = new URL(request.url);
    const upstreamUrl = new URL(path, `${getT3NodeOrigin(process.env.T3N_ENVIRONMENT)}/`);
    upstreamUrl.search = requestUrl.search;

    const init: RequestInit & { duplex: "half" } = {
      method: request.method,
      headers: copyRequestHeaders(request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      cache: "no-store",
      redirect: "error",
      duplex: "half",
    };
    const upstream = await fetch(upstreamUrl, init);

    console.info(`[KYCPass:T3 relay] ${request.method} ${path} returned HTTP ${upstream.status}.`);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream),
    });
  } catch (error) {
    const forbidden = error instanceof Error && error.message.includes("not allowed");
    console.info(
      `[KYCPass:T3 relay] ${request.method} ${requestPath || "(empty)"} ${forbidden ? "rejected by allowlist" : "failed before response"}.`,
    );
    return NextResponse.json(
      {
        error: forbidden
          ? "Terminal 3 proxy path is not allowed."
          : "Terminal 3 node is temporarily unavailable.",
      },
      {
        status: forbidden ? 404 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return relay(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return relay(request, context);
}
