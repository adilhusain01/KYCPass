import { NextResponse } from "next/server";

import { assertDisclosureRequestBinding, assertMinimumDisclosure } from "@/lib/disclosure-policy";
import { disclosureRequestSchema, receiptSchema } from "@/lib/domain";
import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";
import { getDisclosureAgentHealth, invokeDisclosureContract } from "@/lib/t3/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDelegationNotReadyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /not permitted to act on behalf|HTTP 403: Forbidden/i.test(message);
}

function summarizeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 8).join("\n"),
  };
}

function logDisclosureStage(
  requestId: string,
  stage: string,
  startedAt: number,
  details: Record<string, unknown> = {},
) {
  console.info(
    `[KYCPass:Disclosure] ${stage} request=${requestId} elapsed_ms=${Date.now() - startedAt} details=${JSON.stringify(details)}`,
  );
}

async function retryDelegatedExecution<T>(
  operation: () => Promise<T>,
  requestId: string,
): Promise<T> {
  const delays = [0];
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) await sleep(delays[attempt]);
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDelegationNotReadyError(error) || attempt === delays.length - 1) break;
      console.warn(
        `[KYCPass:Disclosure] delegation not ready request=${requestId} attempt=${attempt + 1}; retrying.`,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Terminal 3 delegated execution failed.");
}

export async function GET() {
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
    });
  } catch (error) {
    console.error(
      `[KYCPass:Disclosure] health probe failed elapsed_ms=${Date.now() - startedAt}: ${JSON.stringify(summarizeError(error))}`,
    );
    return NextResponse.json(
      {
        ok: false,
        route: "/api/disclosures/execute",
        error: error instanceof Error ? error.message : "Disclosure route health probe failed.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestId = "unparsed";
  try {
    console.info("[KYCPass:Disclosure] request body parsing started.");
    const body = disclosureRequestSchema.parse(await request.json());
    requestId = body.requestId;
    logDisclosureStage(requestId, "request accepted", startedAt, {
      claims: body.approvedClaims,
      verifier: body.requirement.verifierName,
      verifierOrigin: body.requirement.verifierOrigin,
    });
    const env = getServerEnv();
    logDisclosureStage(requestId, "environment loaded", startedAt, {
      verifierOrigin: env.NEXT_PUBLIC_VERIFIER_ORIGIN,
      contractTail: env.T3N_CONTRACT_TAIL,
      environment: env.T3N_ENVIRONMENT,
    });
    if (!isTeeReachableVerifierOrigin(env.NEXT_PUBLIC_VERIFIER_ORIGIN)) {
      throw new Error("TEE disclosure requires a public HTTPS verifier origin.");
    }
    logDisclosureStage(requestId, "verifier origin reachable", startedAt);
    assertDisclosureRequestBinding(body.requirement, env.NEXT_PUBLIC_VERIFIER_ORIGIN);
    logDisclosureStage(requestId, "request binding validated", startedAt);
    const approvedClaims = assertMinimumDisclosure(body.requirement, body.approvedClaims);
    logDisclosureStage(requestId, "minimum disclosure validated", startedAt, {
      approvedClaims,
      requestedClaims: body.requirement.requestedClaims,
    });
    logDisclosureStage(requestId, "invoke started", startedAt);
    const result = await withTimeout(
      retryDelegatedExecution(
        () =>
          invokeDisclosureContract({
            userDid: body.userDid,
            requestId: body.requestId,
            verifierName: body.requirement.verifierName,
            purpose: body.requirement.purpose,
            claims: approvedClaims,
          }),
        requestId,
      ),
      115_000,
      "Terminal 3 disclosure execution exceeded the hosted function window before returning a receipt. The scoped grant is signed; retry execution or run the disclosure route on a longer-lived Node host.",
    );
    logDisclosureStage(requestId, "invoke returned", startedAt, {
      resultType: typeof result,
    });
    const receipt = receiptSchema.parse(result);
    logDisclosureStage(requestId, "receipt validated", startedAt, {
      receiptId: receipt.receiptId,
      disclosedClaims: receipt.disclosedClaims,
    });
    return NextResponse.json(receipt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disclosure execution failed.";
    console.error(
      `[KYCPass:Disclosure] invoke failed request=${requestId} elapsed_ms=${Date.now() - startedAt}: ${JSON.stringify(summarizeError(error))}`,
    );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
