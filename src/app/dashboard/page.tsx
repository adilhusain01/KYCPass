"use client";

import { Activity, ArrowRight, BadgeCheck, CircleDollarSign, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { StatusBlock } from "@/components/status-block";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { presentAuditEvents, presentUsage } from "@/lib/t3/presentation";
import { useWorkflowStore } from "@/store/workflow-store";

type Overview = {
  did: string;
  contractTail: string;
  contractVersion: string;
  verifierOrigin: string;
  usage: unknown;
  audit: unknown;
};

export default function DashboardPage() {
  const { userDid, emailVerified, levelOneIssued, receipt } = useWorkflowStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(() => {
    fetch("/api/agent/overview", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Agent overview unavailable.");
        setOverview(body);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Agent overview unavailable."));
  }, []);

  const retryOverview = () => {
    setError(null);
    setOverview(null);
    loadOverview();
  };

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const auditEvents = presentAuditEvents(overview?.audit);
  const usage = presentUsage(overview?.usage);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Real state, no demo shortcuts."
        description="User readiness lives in the active wallet session. Agent usage and audit data are fetched server-side from Terminal 3 without exposing the developer key."
        badge={overview ? "Agent online" : error ? "Setup required" : "Connecting"}
      />

      <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusBlock label="Wallet DID" value={userDid ?? "Not connected"} status={userDid ? "ready" : "pending"} />
        <StatusBlock
          label="Verified email"
          value={emailVerified ? "Terminal 3 OTP complete" : "OTP required"}
          status={emailVerified ? "ready" : userDid ? "pending" : "blocked"}
        />
        <StatusBlock
          label="Level-1 credential"
          value={levelOneIssued ? "t3n.user-input.kyc.1" : "Profile not issued"}
          status={levelOneIssued ? "ready" : emailVerified ? "pending" : "blocked"}
        />
        <StatusBlock
          label="Latest receipt"
          value={receipt ? receipt.receiptId : "No disclosure yet"}
          status={receipt ? "ready" : "pending"}
        />
      </div>

      {error ? (
        <div className="mt-7 border-2 border-black bg-[#ff9d2e] p-5 shadow-[5px_5px_0_#111]">
          <p className="font-bold">Terminal 3 agent telemetry is temporarily unavailable.</p>
          <p className="mt-2 break-words font-mono text-xs">{error}</p>
          <Button type="button" variant="neutral" className="mt-4 bg-white" onClick={retryOverview}>
            Retry agent telemetry
          </Button>
        </div>
      ) : null}

      <div className="mt-9 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <ShieldCheck className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Judged flow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/onboarding", icon: KeyRound, title: "Establish identity", text: "MetaMask, OTP, protected profile." },
              { href: "/northstar", icon: ShieldCheck, title: "Partner adapter", text: "Verify inside a platform profile." },
              { href: "/credentials", icon: BadgeCheck, title: "Inspect credentials", text: "Read genuine T3 status and VC IDs." },
              { href: "/audit", icon: Activity, title: "Review evidence", text: "Usage and audit events from T3." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                <item.icon className="size-7" />
                <h2 className="display-type mt-6 text-2xl font-bold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-700">{item.text}</p>
                <ArrowRight className="mt-5 size-5" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#1f5eff] text-white">
          <CardHeader>
            <CircleDollarSign className="size-9 text-[#b8ff2c]" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Agent telemetry</CardTitle>
          </CardHeader>
          <CardContent>
            {!overview && !error ? (
              <div className="space-y-3">
                <Skeleton className="h-20 bg-white/25" />
                <Skeleton className="h-20 bg-white/25" />
              </div>
            ) : (
              <>
                <p className="code-type text-xs uppercase tracking-[0.16em] text-[#b8ff2c]">Current token balance</p>
                <p className="display-type mt-2 text-6xl font-extrabold">{usage.balance}</p>
                <div className="mt-7 space-y-3">
                  {auditEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="border-2 border-white bg-black/25 p-3">
                      <p className="font-bold">{event.action}</p>
                      <p className="mt-1 truncate font-mono text-xs text-white/70">{event.target}</p>
                    </div>
                  ))}
                  {overview && auditEvents.length === 0 ? <p>No audit events returned yet.</p> : null}
                </div>
              </>
            )}
            <Button asChild variant="neutral" className="mt-6 w-full bg-white text-black">
              <Link href="/audit">Open full telemetry</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
