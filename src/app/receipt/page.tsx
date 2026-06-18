"use client";

import { CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimCatalog } from "@/lib/domain";
import { useWorkflowStore } from "@/store/workflow-store";

export default function ReceiptPage() {
  const receipt = useWorkflowStore((state) => state.receipt);

  if (!receipt) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <FileCheck2 className="mx-auto size-14" />
        <h1 className="display-type mt-5 text-5xl font-bold">No receipt yet.</h1>
        <Button asChild className="mt-7">
          <Link href="/verifier">Create a disclosure</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Accepted without returning PII."
        description="The verifier confirms which claim categories were received. Raw values are intentionally absent from this receipt and from the agent response."
        badge="Verified"
      />
      <Card className="mt-10 bg-[#b8ff2c]">
        <CardHeader className="border-b-2 border-black pb-6">
          <CheckCircle2 className="size-14" strokeWidth={2.5} />
          <CardTitle className="display-type mt-6 text-5xl font-extrabold sm:text-7xl">
            KYC accepted.
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-7 pt-2 md:grid-cols-2">
          <div className="space-y-4">
            {[
              ["Receipt", receipt.receiptId],
              ["Verifier", receipt.verifier],
              ["Credential", receipt.kycLevel],
              ["Timestamp", new Date(receipt.verifiedAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="code-type text-[10px] uppercase tracking-[0.16em]">{label}</p>
                <p className="mt-1 break-all font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-2 border-black bg-white p-5">
            <p className="code-type text-xs font-bold uppercase tracking-[0.16em]">Disclosed categories</p>
            <div className="mt-4 grid gap-3">
              {receipt.disclosedClaims.map((claim) => (
                <div key={claim} className="flex items-center gap-3 border-2 border-black p-3">
                  <ShieldCheck className="size-5 text-[#1f5eff]" />
                  <span className="font-bold">{claimCatalog[claim].label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/audit">Inspect audit trail</Link>
        </Button>
        <Button asChild variant="neutral">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
