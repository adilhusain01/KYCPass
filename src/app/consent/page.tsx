"use client";

import { ArrowLeft, Check, Loader2, LockKeyhole, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimCatalog, receiptSchema } from "@/lib/domain";
import { createDisclosurePlan } from "@/lib/disclosure-policy";
import { grantDisclosureAccess } from "@/lib/t3/browser-client";
import { useWorkflowStore } from "@/store/workflow-store";

type PublicConfig = {
  agentDid: string;
  tenantDid: string;
  contractTail: string;
  contractVersion: string;
  verifierOrigin: string;
  verifierTeeReachable: boolean;
};

type ExecutionStage = "idle" | "config" | "grant" | "execute";

async function readResponseBody(response: Response) {
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

export default function ConsentPage() {
  const router = useRouter();
  const [executing, setExecuting] = useState(false);
  const [stage, setStage] = useState<ExecutionStage>("idle");
  const [grantSigned, setGrantSigned] = useState(false);
  const requirement = useWorkflowStore((state) => state.requirement);
  const userDid = useWorkflowStore((state) => state.userDid);
  const setReceipt = useWorkflowStore((state) => state.setReceipt);

  if (!requirement) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-14" />
        <h1 className="display-type mt-5 text-5xl font-bold">No active request.</h1>
        <p className="mt-4">Create a verifier request before opening consent.</p>
        <Button asChild className="mt-7">
          <Link href="/verifier">Open verifier</Link>
        </Button>
      </div>
    );
  }

  const plan = createDisclosurePlan(requirement);

  async function approveAndExecute() {
    if (!userDid) {
      toast.error("Connect and authenticate MetaMask before approving.");
      return;
    }
    setExecuting(true);
    setStage("config");
    try {
      console.info("[KYCPass:Disclosure] Loading public server configuration.");
      const configResponse = await fetch("/api/config", { cache: "no-store" });
      const configBody = await configResponse.json();
      if (!configResponse.ok) throw new Error(configBody.error ?? "Server configuration unavailable.");
      const config = configBody as PublicConfig;
      if (!config.verifierTeeReachable) {
        throw new Error(
          "TEE disclosure requires a public HTTPS verifier origin. Deploy KYCPass or configure a secure public tunnel before approving this grant.",
        );
      }
      if (!grantSigned) {
        setStage("grant");
        console.info("[KYCPass:Disclosure] Requesting scoped Terminal 3 grant signature.");
        await grantDisclosureAccess({
          agentDid: config.agentDid,
          tenantDid: config.tenantDid,
          contractTail: config.contractTail,
          contractVersion: config.contractVersion,
          verifierHost: new URL(config.verifierOrigin).hostname,
        });
        setGrantSigned(true);
        toast.success("Scoped Terminal 3 grant signed.");
      } else {
        console.info("[KYCPass:Disclosure] Reusing scoped Terminal 3 grant from this page session.");
      }

      const requestId = crypto.randomUUID();
      setStage("execute");
      console.info(`[KYCPass:Disclosure] Calling server execution route request=${requestId}.`);
      toast.info("Executing protected disclosure inside Terminal 3.");
      const { response, body } = await fetchJsonWithTimeout(
        "/api/disclosures/execute",
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
      setReceipt(receiptSchema.parse(body));
      toast.success("Verifier accepted the protected disclosure.");
      router.push("/receipt");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disclosure failed.");
    } finally {
      setExecuting(false);
      setStage("idle");
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Human approval boundary"
        title="Inspect the exact disclosure."
        description="Approval creates a Terminal 3 grant restricted to one agent DID, one contract function, one contract version, and one verifier host."
        badge={`${plan.claims.length} claims`}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle className="display-type text-4xl font-bold">{requirement.verifierName}</CardTitle>
            <p className="mt-3 leading-7 text-stone-700">{requirement.purpose}</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {plan.claims.map((claim) => (
              <div key={claim} className="flex gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111]">
                <span className="grid size-8 shrink-0 place-items-center border-2 border-black bg-[#b8ff2c]">
                  <Check className="size-4" />
                </span>
                <div>
                  <h2 className="font-bold">{claimCatalog[claim].label}</h2>
                  <p className="mt-1 text-sm text-stone-700">{claimCatalog[claim].description}</p>
                  <p className="code-type mt-2 text-[10px] uppercase tracking-[0.15em]">
                    {claimCatalog[claim].placeholders.join(" + ")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#1f5eff] text-white">
          <CardHeader>
            <LockKeyhole className="size-10 text-[#b8ff2c]" />
            <CardTitle className="display-type mt-6 text-4xl font-bold">Grant boundary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Function", "submit-kyc-proof"],
              ["Host", new URL(requirement.verifierOrigin).hostname],
              ["Expiry", new Date(requirement.expiresAt).toLocaleTimeString()],
              ["Return value", "Sanitized receipt only"],
            ].map(([label, value]) => (
              <div key={label} className="border-b-2 border-white/40 pb-3">
                <p className="code-type text-[10px] uppercase tracking-[0.16em] text-[#b8ff2c]">{label}</p>
                <p className="mt-1 break-all font-semibold">{value}</p>
              </div>
            ))}
            <Button
              size="lg"
              className="w-full bg-[#b8ff2c] text-black"
              onClick={approveAndExecute}
              disabled={executing}
            >
              {executing ? <Loader2 className="animate-spin" /> : <Send />}
              {executing
                ? stage === "grant"
                  ? "Waiting for grant signature"
                  : stage === "execute"
                    ? "Executing inside T3N"
                    : "Preparing disclosure"
                : grantSigned
                  ? "Retry T3 execution"
                  : "Approve and disclose"}
            </Button>
            <Button asChild variant="neutral" className="w-full bg-white text-black">
              <Link href="/verifier">
                <ArrowLeft /> Reject request
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
