import "server-only";

import { assertDisclosureRequestBinding, assertMinimumDisclosure } from "@/lib/disclosure-policy";
import { disclosureRequestSchema, receiptSchema, type DisclosureReceipt } from "@/lib/domain";
import { getServerEnv, isTeeReachableVerifierOrigin } from "@/lib/env";
import { invokeDisclosureContract } from "@/lib/t3/server-client";

const DISCLOSURE_TIMEOUT_MS = 115_000;

export type DisclosureExecutionSource = "browser" | "agent-api" | "mcp";

type ExecutionContext = {
  source: DisclosureExecutionSource;
  invocationId?: string;
};

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

function getVerifierUrl(requirement: { verifierOrigin: string; verifierUrl?: string }) {
  return requirement.verifierUrl ?? `${requirement.verifierOrigin}/api/verifier/submit`;
}

function logDisclosureStage(
  requestId: string,
  stage: string,
  startedAt: number,
  context: ExecutionContext,
  details: Record<string, unknown> = {},
) {
  console.info(
    `[KYCPass:Disclosure] ${stage} request=${requestId} source=${context.source} elapsed_ms=${Date.now() - startedAt} details=${JSON.stringify(details)}`,
  );
}

export function summarizeDisclosureError(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 8).join("\n"),
  };
}

export async function executeDisclosureRequest(
  input: unknown,
  context: ExecutionContext,
): Promise<DisclosureReceipt> {
  const startedAt = Date.now();
  const body = disclosureRequestSchema.parse(input);
  const requestId = body.requestId;
  const verifierUrl = getVerifierUrl(body.requirement);

  logDisclosureStage(requestId, "request accepted", startedAt, context, {
    invocationId: context.invocationId,
    claims: body.approvedClaims,
    verifier: body.requirement.verifierName,
    verifierOrigin: body.requirement.verifierOrigin,
  });

  const env = getServerEnv();
  if (!isTeeReachableVerifierOrigin(body.requirement.verifierOrigin)) {
    throw new Error("TEE disclosure requires a public HTTPS verifier origin.");
  }

  assertDisclosureRequestBinding(body.requirement, env.NEXT_PUBLIC_VERIFIER_ORIGIN);
  const approvedClaims = assertMinimumDisclosure(body.requirement, body.approvedClaims);
  logDisclosureStage(requestId, "policy validated", startedAt, context, {
    approvedClaims,
    contractTail: env.T3N_CONTRACT_TAIL,
    environment: env.T3N_ENVIRONMENT,
  });

  const result = await withTimeout(
    invokeDisclosureContract({
      userDid: body.userDid,
      requestId,
      verifierName: body.requirement.verifierName,
      verifierOrigin: body.requirement.verifierOrigin,
      verifierUrl,
      purpose: body.requirement.purpose,
      claims: approvedClaims,
    }),
    DISCLOSURE_TIMEOUT_MS,
    "Terminal 3 disclosure execution exceeded the hosted function window before returning a receipt. The scoped grant is signed; retry execution or run the disclosure route on a longer-lived Node host.",
  );

  const receipt = receiptSchema.parse(result);
  logDisclosureStage(requestId, "receipt validated", startedAt, context, {
    receiptId: receipt.receiptId,
    disclosedClaims: receipt.disclosedClaims,
  });
  return receipt;
}
