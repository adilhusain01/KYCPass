"use client";

import { receiptSchema, type ClaimId, type DisclosureReceipt, type KycRequirement } from "@/lib/domain";
import { createDisclosurePlan } from "@/lib/disclosure-policy";
import { grantDisclosureAccess } from "@/lib/t3/browser-client";

export type PublicDisclosureConfig = {
  agentDid: string;
  tenantDid: string;
  contractTail: string;
  contractVersion: string;
  userContractVersion: string;
  verifierOrigin: string;
  verifierTeeReachable: boolean;
};

export type ExecutionStage = "idle" | "config" | "grant" | "execute";

export async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      error: `Server returned non-JSON response: ${text.slice(0, 220)}`,
    };
  }
}

async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const body = await readResponseBody(response);
    return { response, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Disclosure execution timed out before the server returned a receipt.");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function disclosureErrorMessage(error: unknown, stage: ExecutionStage) {
  const message = error instanceof Error ? error.message : "Disclosure failed.";
  if (/failed to fetch/i.test(message)) {
    if (stage === "config") {
      return "Failed to fetch public KYCPass configuration. Check the deployed app network connection and retry.";
    }
    if (stage === "grant") {
      return "Failed to reach Terminal 3 while signing the scoped grant. Reconnect the Terminal 3 session and retry.";
    }
    if (stage === "execute") {
      return "Failed to reach the KYCPass disclosure execution route. Retry after the latest deployment is ready.";
    }
  }
  return message;
}

function isTeeReachableOrigin(origin: string) {
  const url = new URL(origin);
  return (
    url.protocol === "https:" &&
    !["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
  );
}

function apiUrl(apiOrigin: string | undefined, path: string) {
  return `${apiOrigin?.replace(/\/$/, "") ?? ""}${path}`;
}

export async function loadDisclosureConfig(apiOrigin?: string): Promise<PublicDisclosureConfig> {
  const configResponse = await fetch(apiUrl(apiOrigin, "/api/config"), { cache: "no-store" });
  const configBody = await readResponseBody(configResponse);
  const parsedConfigBody = configBody as { error?: string };
  if (!configResponse.ok) {
    throw new Error(parsedConfigBody.error ?? "Server configuration unavailable.");
  }
  return configBody as PublicDisclosureConfig;
}

export async function executeDisclosure({
  userDid,
  requirement,
  onStage,
  grantAlreadySigned,
  apiOrigin,
  t3RelayOrigin,
}: {
  userDid: string;
  requirement: KycRequirement;
  onStage?: (stage: Exclude<ExecutionStage, "idle">) => void;
  grantAlreadySigned?: boolean;
  apiOrigin?: string;
  t3RelayOrigin?: string;
}): Promise<{ receipt: DisclosureReceipt; approvedClaims: ClaimId[]; grantSigned: boolean }> {
  onStage?.("config");
  console.info("[KYCPass:Disclosure] Loading public server configuration.");
  const config = await loadDisclosureConfig(apiOrigin);
  if (!isTeeReachableOrigin(requirement.verifierOrigin)) {
    throw new Error(
      "TEE disclosure requires a public HTTPS verifier origin. Deploy the partner verifier or configure a secure public tunnel before approving this grant.",
    );
  }

  if (!grantAlreadySigned) {
    onStage?.("grant");
    console.info("[KYCPass:Disclosure] Requesting scoped Terminal 3 grant signature.");
    await grantDisclosureAccess({
      agentDid: config.agentDid,
      tenantDid: config.tenantDid,
      contractTail: config.contractTail,
      contractVersion: config.contractVersion,
      userContractVersion: config.userContractVersion,
      verifierHost: new URL(requirement.verifierOrigin).hostname,
      t3RelayOrigin,
    });
  } else {
    console.info("[KYCPass:Disclosure] Reusing scoped Terminal 3 grant from this page session.");
  }

  const requestId = crypto.randomUUID();
  const plan = createDisclosurePlan(requirement);
  onStage?.("execute");
  console.info(`[KYCPass:Disclosure] Calling server execution route request=${requestId}.`);
  const { response, body } = await fetchJsonWithTimeout(
    apiUrl(apiOrigin, "/api/disclosures/execute"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        userDid,
        requirement,
        approvedClaims: plan.claims,
      }),
    },
    115_000,
  );
  const parsedBody = body as { error?: string };
  if (!response.ok) throw new Error(parsedBody.error ?? "TEE disclosure failed.");

  return {
    receipt: receiptSchema.parse(body),
    approvedClaims: plan.claims,
    grantSigned: true,
  };
}
