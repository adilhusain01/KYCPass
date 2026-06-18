"use client";

import { BadgeCheck, Loader2, RefreshCw, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLevelTwoStatus } from "@/lib/t3/browser-client";
import { isLevelTwoNotInitiatedError } from "@/lib/t3/errors";
import { useWorkflowStore } from "@/store/workflow-store";

type LevelTwoView =
  | { state: "not-queried" }
  | { state: "not-initiated" }
  | { state: "available"; value: unknown };

export default function CredentialsPage() {
  const { userDid, emailVerified, levelOneIssued } = useWorkflowStore();
  const [levelTwo, setLevelTwo] = useState<LevelTwoView>({ state: "not-queried" });
  const [loading, setLoading] = useState(false);

  async function refreshLevelTwo() {
    setLoading(true);
    try {
      setLevelTwo({ state: "available", value: await readLevelTwoStatus() });
      toast.success("Terminal 3 KYC status refreshed.");
    } catch (error) {
      if (isLevelTwoNotInitiatedError(error)) {
        setLevelTwo({ state: "not-initiated" });
        toast.info("Level 2 has not been initiated for this Terminal 3 DID.");
      } else {
        toast.error(error instanceof Error ? error.message : "KYC status request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Credential registry"
        title="Only genuine issuance counts."
        description="Level 1 reflects the live onboarding session. Level 2 is read from Terminal 3 and is displayed exactly as returned; KYCPass does not initiate or invent provider approval."
        badge={userDid ? "Wallet session active" : "Connect wallet first"}
      />

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card className={levelOneIssued ? "bg-[#b8ff2c]" : "bg-white"}>
          <CardHeader>
            <BadgeCheck className="size-10" />
            <CardTitle className="display-type mt-6 text-4xl font-bold">Level 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="code-type text-sm font-bold">t3n.user-input.kyc.1</p>
            <div className="mt-6 grid gap-3">
              <Row label="Wallet authenticated" value={userDid ? "Yes" : "No"} />
              <Row label="Email verified" value={emailVerified ? "Yes" : "No"} />
              <Row label="Profile submitted" value={levelOneIssued ? "Yes" : "No"} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#ff8ac5]">
          <CardHeader>
            <ShieldQuestion className="size-10" />
            <CardTitle className="display-type mt-6 text-4xl font-bold">Level 2 status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7">
              This is an integration surface for externally initiated verification. No approval is synthesized.
            </p>
            {levelTwo.state === "available" ? (
              <pre className="mt-5 max-h-64 overflow-auto border-2 border-black bg-white p-4 font-mono text-xs whitespace-pre-wrap">
                {JSON.stringify(levelTwo.value, null, 2)}
              </pre>
            ) : (
              <div className="mt-5 border-2 border-black bg-white p-4 font-mono text-xs">
                {levelTwo.state === "not-initiated"
                  ? "Not initiated. No provider session exists for this DID."
                  : "Not queried in this session."}
              </div>
            )}
            <Button className="mt-5 w-full" onClick={refreshLevelTwo} disabled={loading || !userDid}>
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Refresh from Terminal 3
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-black pb-2">
      <span className="font-semibold">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}
