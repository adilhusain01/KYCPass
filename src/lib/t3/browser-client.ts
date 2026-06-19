"use client";

import {
  T3nClient,
  createEthAuthInput,
  loadWasmComponent,
  metamask_get_address,
  metamask_sign,
  setEnvironment,
  setNodeUrl,
  type KycStatus,
  type OtpRequestResult,
  type OtpVerifyResult,
  type SubmitUserInputResult,
  type UsagePage,
} from "@terminal3/t3n-sdk";

import { buildTerminalUserProfile, type UserProfileInput } from "@/lib/domain";
import { buildDisclosureGrant, type DisclosureGrantInput } from "@/lib/t3/grants";
import { isLevelTwoNotInitiatedError } from "@/lib/t3/errors";
import {
  classifySessionError,
  recordSessionDiagnostic,
} from "@/lib/t3/session-diagnostics";

type BrowserSession = {
  client: T3nClient;
  address: string;
  did: string;
};

let sessionPromise: Promise<BrowserSession> | null = null;
let sessionApiOrigin: string | null = null;

function isMissingSessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /session not found|session expired|session.*no longer usable/i.test(message);
}

function browserSessionError(error: unknown): Error {
  if (isMissingSessionError(error)) {
    return new Error(
      "Terminal 3 lost this session. Reconnect, request a new OTP, and verify that new code without reloading the page.",
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|connection closed|networkerror/i.test(message)) {
    return new Error(
      "Terminal 3 could not be reached. Wait a few seconds and reconnect before requesting a new OTP.",
    );
  }
  return error instanceof Error ? error : new Error("Terminal 3 browser session failed.");
}

function getEnvironment() {
  return process.env.NEXT_PUBLIC_T3N_ENVIRONMENT === "production"
    ? "production"
    : "testnet";
}

function normalizeApiOrigin(apiOrigin?: string) {
  return (apiOrigin ?? window.location.origin).replace(/\/$/, "");
}

function configureBrowserTransport(apiOrigin?: string) {
  setEnvironment(getEnvironment());
  setNodeUrl(`${normalizeApiOrigin(apiOrigin)}/api/t3`);
  recordSessionDiagnostic(
    "transport",
    "success",
    "Using the same-origin Terminal 3 session-affinity relay.",
  );
}

export async function connectUserSession(apiOrigin?: string): Promise<BrowserSession> {
  const nextApiOrigin = normalizeApiOrigin(apiOrigin);
  if (sessionApiOrigin && sessionApiOrigin !== nextApiOrigin) {
    sessionPromise = null;
  }
  sessionApiOrigin = nextApiOrigin;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    recordSessionDiagnostic("connect", "started", "Starting a fresh Terminal 3 browser session.");
    configureBrowserTransport(nextApiOrigin);
    recordSessionDiagnostic("wallet-address", "started", "Requesting the active MetaMask account.");
    const address = await metamask_get_address();
    recordSessionDiagnostic("wallet-address", "success", "MetaMask returned an account.");
    const client = new T3nClient({
      wasmComponent: await loadWasmComponent(),
      handlers: { EthSign: metamask_sign(address) },
    });
    recordSessionDiagnostic("handshake", "started", "Requesting a Terminal 3 encrypted session.");
    await client.handshake();
    recordSessionDiagnostic(
      "handshake",
      "success",
      client.getSessionId() ? "Terminal 3 minted a browser session." : "Handshake completed.",
    );
    recordSessionDiagnostic("authenticate", "started", "Requesting MetaMask authentication.");
    const did = await client.authenticate(createEthAuthInput(address));
    recordSessionDiagnostic("authenticate", "success", "Terminal 3 authenticated the wallet DID.");
    return { client, address, did: did.value };
  })().catch((error) => {
    sessionPromise = null;
    recordSessionDiagnostic("connect", "error", classifySessionError(error));
    throw browserSessionError(error);
  });

  return sessionPromise;
}

export function disconnectUserSession() {
  sessionPromise = null;
  sessionApiOrigin = null;
  recordSessionDiagnostic("disconnect", "warning", "Cleared the cached Terminal 3 browser session.");
}

async function withUserSession<T>(
  operationName: string,
  operation: (client: T3nClient) => Promise<T>,
  apiOrigin?: string,
): Promise<T> {
  const { client } = await connectUserSession(apiOrigin);
  recordSessionDiagnostic(operationName, "started", `Calling Terminal 3 ${operationName}.`);
  try {
    const result = await operation(client);
    recordSessionDiagnostic(operationName, "success", `Terminal 3 ${operationName} completed.`);
    return result;
  } catch (error) {
    if (operationName === "level-two-status" && isLevelTwoNotInitiatedError(error)) {
      recordSessionDiagnostic(
        operationName,
        "warning",
        "Level 2 has not been initiated for this Terminal 3 DID.",
      );
      throw browserSessionError(error);
    }
    recordSessionDiagnostic(operationName, "error", classifySessionError(error));
    if (isMissingSessionError(error)) {
      disconnectUserSession();
    }
    throw browserSessionError(error);
  }
}

export async function requestEmailOtp(email: string): Promise<OtpRequestResult> {
  return withUserSession("otp-request", (client) =>
    client.otpRequest({ emailChannel: { emailAddress: email } }),
  );
}

export async function verifyEmailOtp(email: string, code: string): Promise<OtpVerifyResult> {
  return withUserSession("otp-verify", (client) =>
    client.otpVerify({
      otpCode: code,
      request: { emailChannel: { emailAddress: email } },
    }),
  );
}

export async function submitLevelOneProfile(
  profile: UserProfileInput,
): Promise<SubmitUserInputResult> {
  return withUserSession("level-one-submit", (client) =>
    client.submitUserInput({ profile: buildTerminalUserProfile(profile) }),
  );
}

export async function readLevelTwoStatus(): Promise<KycStatus> {
  return withUserSession("level-two-status", (client) => client.kycStatus());
}

export async function readUserUsage(): Promise<UsagePage> {
  return withUserSession("usage-read", (client) => client.getUsage({ limit: 20 }));
}

export async function readUserAudit() {
  return withUserSession("audit-read", (client) => client.getAuditEvents({ limit: 30 }));
}

export async function grantDisclosureAccess(
  input: DisclosureGrantInput & { userContractVersion: string; t3RelayOrigin?: string },
) {
  recordSessionDiagnostic(
    "grant-version",
    "success",
    `Using server-resolved Terminal 3 user-contract version: ${input.userContractVersion}.`,
  );

  return withUserSession(
    "grant-update",
    (client) =>
      client.executeAndDecode({
        script_name: "tee:user/contracts",
        script_version: input.userContractVersion,
        function_name: "agent-auth-update",
        input: buildDisclosureGrant(input),
      }),
    input.t3RelayOrigin,
  );
}
