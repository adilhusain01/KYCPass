"use client";

import { Check, KeyRound, Loader2, ServerCog, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicConfig = {
  agentDid: string;
  tenantDid: string;
  contractTail: string;
  contractVersion: string;
  verifierOrigin: string;
  verifierTeeReachable: boolean;
  environment: string;
};

export default function SettingsPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Configuration unavailable.");
        setConfig(body);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Configuration unavailable."));
  }, []);

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Deployment configuration"
        title="Public facts only."
        description="This screen confirms the non-secret contract and verifier configuration. The developer key and verifier secret are never serialized into an API response."
        badge={
          config
            ? config.verifierTeeReachable
              ? "TEE egress ready"
              : "Local setup only"
            : error
              ? "Configuration invalid"
              : "Checking"
        }
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.7fr]">
        <Card>
          <CardHeader>
            <ServerCog className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!config && !error ? <Loader2 className="size-8 animate-spin" /> : null}
            {error ? (
              <div className="border-2 border-black bg-[#ff5f57] p-4">
                <TriangleAlert />
                <p className="mt-3 font-bold">{error}</p>
              </div>
            ) : null}
            {config && !config.verifierTeeReachable ? (
              <div className="border-2 border-black bg-[#ff9d2e] p-4 shadow-[4px_4px_0_#111]">
                <TriangleAlert />
                <p className="mt-3 font-bold">Final TEE disclosure is not reachable yet.</p>
                <p className="mt-2 text-sm leading-6">
                  Configure a public HTTPS verifier origin before requesting the disclosure grant.
                  A remote Terminal 3 TEE cannot call this laptop&apos;s localhost.
                </p>
              </div>
            ) : null}
            {config
              ? [
                  ["Environment", config.environment],
                  ["Agent DID", config.agentDid],
                  ["Tenant DID", config.tenantDid],
                  ["Contract", `${config.contractTail}@${config.contractVersion}`],
                  ["Verifier", config.verifierOrigin],
                ].map(([label, value]) => (
                  <div key={label} className="border-2 border-black bg-white p-4">
                    <p className="code-type text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p>
                    <p className="mt-2 break-all font-mono text-xs">{value}</p>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card className="bg-[#b8ff2c]">
          <CardHeader>
            <ShieldCheck className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Secret boundary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: KeyRound, text: "T3N_API_KEY is server-only." },
              { icon: ShieldCheck, text: "Verifier secret is passed only into encrypted TEE execution." },
              {
                icon: Check,
                text: "OTP and profile fields cross the affinity relay only as opaque encrypted SDK traffic.",
              },
              { icon: Check, text: "Receipts contain claim names, never claim values." },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 border-2 border-black bg-white p-4">
                <item.icon className="size-5 shrink-0" />
                <p className="font-semibold">{item.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
