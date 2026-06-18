import { NextResponse } from "next/server";

import { assertDisclosureRequestBinding, assertMinimumDisclosure } from "@/lib/disclosure-policy";
import { disclosureRequestSchema, receiptSchema } from "@/lib/domain";
import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";
import { invokeDisclosureContract } from "@/lib/t3/server-client";

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

export async function POST(request: Request) {
  const startedAt = Date.now();
  let requestId = "unparsed";
  try {
    const body = disclosureRequestSchema.parse(await request.json());
    requestId = body.requestId;
    console.info(
      `[KYCPass:Disclosure] execute accepted request=${requestId} claims=${body.approvedClaims.length}.`,
    );
    const env = getServerEnv();
    if (!isTeeReachableVerifierOrigin(env.NEXT_PUBLIC_VERIFIER_ORIGIN)) {
      throw new Error("TEE disclosure requires a public HTTPS verifier origin.");
    }
    assertDisclosureRequestBinding(body.requirement, env.NEXT_PUBLIC_VERIFIER_ORIGIN);
    const approvedClaims = assertMinimumDisclosure(body.requirement, body.approvedClaims);
    console.info(`[KYCPass:Disclosure] invoke started request=${requestId}.`);
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
    console.info(
      `[KYCPass:Disclosure] invoke succeeded request=${requestId} elapsed_ms=${Date.now() - startedAt}.`,
    );
    return NextResponse.json(receiptSchema.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Disclosure execution failed.";
    console.error(
      `[KYCPass:Disclosure] invoke failed request=${requestId} elapsed_ms=${Date.now() - startedAt}: ${message}`,
    );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
