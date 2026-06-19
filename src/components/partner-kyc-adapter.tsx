"use client";

import { AlertTriangle, BadgeCheck, Check, Loader2, LockKeyhole, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ClaimId, DisclosureReceipt, KycRequirement } from "@/lib/domain";
import {
  disclosureErrorMessage,
  executeDisclosure,
  readResponseBody,
  type ExecutionStage,
} from "@/lib/disclosure/browser-execution";
import { claimCatalog } from "@/lib/domain";
import { hasReceiptForClaims } from "@/lib/partner-verification";
import { connectUserSession } from "@/lib/t3/browser-client";
import { useWorkflowStore } from "@/store/workflow-store";

type PartnerKycAdapterProps = {
  kycpassOrigin?: string;
  t3RelayOrigin?: string;
  partnerId: string;
  partnerName: string;
  verifierUrl?: string;
  purpose: string;
  requestedClaims: ClaimId[];
  returnPath?: "/northstar";
  onVerified?: (receipt: DisclosureReceipt) => void;
};

type PartnerKycRequestResponse = {
  requirement: KycRequirement;
  adapter: {
    provider: "KYCPass";
    credential: "t3n.user-input.kyc.1";
    mode: "embedded";
    storesRawPii: false;
    disclosure: "terminal3-tee";
  };
};

function apiUrl(apiOrigin: string | undefined, path: string) {
  return `${apiOrigin?.replace(/\/$/, "") ?? ""}${path}`;
}

async function createPartnerRequest({
  kycpassOrigin,
  partnerId,
  partnerName,
  verifierUrl,
  purpose,
  requestedClaims,
  returnPath,
}: PartnerKycAdapterProps): Promise<PartnerKycRequestResponse> {
  const response = await fetch(apiUrl(kycpassOrigin, "/api/partners/kyc-request"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partner: {
        id: partnerId,
        name: partnerName,
        origin: window.location.origin,
        verifierUrl,
      },
      purpose,
      requestedClaims,
      returnPath,
    }),
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? "KYCPass request creation failed.");
  }
  return body as PartnerKycRequestResponse;
}

export function PartnerKycAdapter(props: PartnerKycAdapterProps) {
  const executingRef = useRef(false);
  const [stage, setStage] = useState<ExecutionStage>("idle");
  const [grantSigned, setGrantSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequirement, setLastRequirement] = useState<KycRequirement | null>(null);
  const address = useWorkflowStore((state) => state.address);
  const userDid = useWorkflowStore((state) => state.userDid);
  const levelOneIssued = useWorkflowStore((state) => state.levelOneIssued);
  const receipt = useWorkflowStore((state) => state.receipt);
  const setIdentity = useWorkflowStore((state) => state.setIdentity);
  const setRequirement = useWorkflowStore((state) => state.setRequirement);
  const setReceipt = useWorkflowStore((state) => state.setReceipt);
  const verified = hasReceiptForClaims(receipt, props.partnerName, props.requestedClaims);
  const usesExternalKycpass = Boolean(props.kycpassOrigin);

  async function connectWallet() {
    setError(null);
    setStage("config");
    try {
      const session = await connectUserSession(props.t3RelayOrigin ?? props.kycpassOrigin);
      setIdentity(session.address, session.did);
      toast.success("Wallet connected to KYCPass.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wallet connection failed.";
      setError(message);
      toast.error(message);
    } finally {
      setStage("idle");
    }
  }

  async function verifyInsidePartner() {
    if (executingRef.current) return;
    if (!userDid) {
      await connectWallet();
      return;
    }
    if (!usesExternalKycpass && !levelOneIssued) return;

    executingRef.current = true;
    setError(null);
    let currentStage: ExecutionStage = "config";
    setStage(currentStage);
    try {
      const response = await createPartnerRequest(props);
      setRequirement(response.requirement);
      setLastRequirement(response.requirement);
      toast.info("KYCPass adapter created a scoped verification request.");

      const result = await executeDisclosure({
        userDid,
        requirement: response.requirement,
        grantAlreadySigned: grantSigned,
        apiOrigin: props.kycpassOrigin,
        t3RelayOrigin: props.t3RelayOrigin ?? props.kycpassOrigin,
        onStage: (nextStage) => {
          currentStage = nextStage;
          setStage(nextStage);
        },
      });
      setGrantSigned(result.grantSigned);
      setReceipt(result.receipt);
      props.onVerified?.(result.receipt);
      toast.success(`${props.partnerName} accepted the KYCPass verification.`);
    } catch (caught) {
      const message = disclosureErrorMessage(caught, currentStage);
      setError(message);
      toast.error(message);
    } finally {
      executingRef.current = false;
      setStage("idle");
    }
  }

  const executing = stage !== "idle";

  return (
    <div className="rounded-3xl border border-[#12231d]/15 bg-[#f4f1e8] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#d9ff70] text-[#0c352b]">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <h3 className="text-2xl font-extrabold tracking-[-0.04em]">KYCPass adapter</h3>
              <p className="text-sm font-semibold text-[#44635a]">Embedded partner verification API</p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#44635a]">
            This platform requests scoped claims from KYCPass. Terminal 3 sends approved fields to
            the verifier endpoint; this profile stores only the receipt.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#0c352b]">
          {verified ? "Verified" : userDid ? "Wallet linked" : "Wallet required"}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {props.requestedClaims.map((claim) => (
          <div key={claim} className="flex items-start gap-3 rounded-2xl bg-white p-4">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#d9ff70]">
              <Check className="size-4" />
            </span>
            <div>
              <p className="font-bold">{claimCatalog[claim].label}</p>
              <p className="mt-1 text-sm leading-6 text-[#44635a]">{claimCatalog[claim].description}</p>
            </div>
          </div>
        ))}
      </div>

      {address || userDid ? (
        <div className="mt-5 rounded-2xl bg-white p-4 text-xs leading-5 text-[#44635a]">
          <p className="font-semibold text-[#12231d]">Platform login</p>
          <p className="mt-1 break-all">Wallet: {address ?? "connected through Terminal 3 DID"}</p>
          <p className="mt-1 break-all">DID: {userDid ?? "not authenticated"}</p>
          {usesExternalKycpass && !levelOneIssued ? (
            <p className="mt-2">
              KYCPass profile status will be checked by Terminal 3 during disclosure execution.
            </p>
          ) : null}
        </div>
      ) : null}

      {verified && receipt ? (
        <div className="mt-5 rounded-2xl bg-[#d9ff70] p-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="size-6" />
            <p className="font-extrabold">Identity verified on this platform</p>
          </div>
          <p className="mt-3 break-all font-mono text-xs">Receipt: {receipt.receiptId}</p>
          <p className="mt-2 text-sm">Verified at {new Date(receipt.verifiedAt).toLocaleString()}</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 flex gap-3 rounded-2xl bg-[#fff0b8] p-4 text-sm leading-6 text-[#7b5300]">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {!userDid ? (
          <Button type="button" className="min-h-12 rounded-full bg-[#0c352b] text-white" onClick={connectWallet} disabled={executing}>
            {executing ? <Loader2 className="animate-spin" /> : <Wallet />}
            Login with MetaMask
          </Button>
        ) : !usesExternalKycpass && !levelOneIssued ? (
          <Button asChild className="min-h-12 rounded-full bg-[#0c352b] text-white">
            <Link href="/onboarding">Create KYCPass profile</Link>
          </Button>
        ) : (
          <Button
            type="button"
            className="min-h-12 rounded-full bg-[#0c352b] text-white"
            onClick={verifyInsidePartner}
            disabled={executing || verified}
          >
            {executing ? <Loader2 className="animate-spin" /> : <Send />}
            {executing
              ? stage === "grant"
                ? "Approve grant in MetaMask"
                : stage === "execute"
                  ? "Verifying with Terminal 3"
                  : "Preparing KYCPass"
              : verified
                ? "Verification complete"
                : "Verify inside this platform"}
          </Button>
        )}
        <Button asChild variant="neutral" className="min-h-12 rounded-full bg-white text-[#0c352b]">
          <Link href={lastRequirement ? "/receipt" : "/dashboard"}>{lastRequirement ? "Open receipt" : "View KYCPass"}</Link>
        </Button>
      </div>
    </div>
  );
}
