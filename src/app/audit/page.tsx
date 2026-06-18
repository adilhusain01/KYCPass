"use client";

import { Activity, CircleDollarSign, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readUserAudit, readUserUsage } from "@/lib/t3/browser-client";
import { presentAuditEvents, presentUsage } from "@/lib/t3/presentation";
import { useWorkflowStore } from "@/store/workflow-store";

export default function AuditPage() {
  const userDid = useWorkflowStore((state) => state.userDid);
  const [audit, setAudit] = useState<unknown>(null);
  const [usage, setUsage] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [userAudit, userUsage] = await Promise.all([readUserAudit(), readUserUsage()]);
      setAudit(userAudit);
      setUsage(userUsage);
      toast.success("Terminal 3 telemetry refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Telemetry request failed.");
    } finally {
      setLoading(false);
    }
  }

  const events = presentAuditEvents(audit);
  const presentedUsage = presentUsage(usage);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Terminal 3 evidence"
        title="Audit the actions, not the identity."
        description="The presentation layer intentionally reduces events to action, protected target, timestamp, and token movement. Profile values are never rendered here."
        badge={audit ? `${events.length} events` : "Not loaded"}
      />

      <Button className="mt-8" onClick={refresh} disabled={loading || !userDid}>
        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Fetch user telemetry
      </Button>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <Activity className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Audit events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event) => (
              <article key={event.id} className="grid gap-2 border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111] sm:grid-cols-[1fr_auto]">
                <div>
                  <h2 className="font-bold">{event.action}</h2>
                  <p className="mt-1 break-all font-mono text-xs text-stone-600">{event.target}</p>
                </div>
                <time className="font-mono text-xs">{event.occurredAt}</time>
              </article>
            ))}
            {!audit ? <p>Connect MetaMask and fetch the live event feed.</p> : null}
            {audit && events.length === 0 ? <p>Terminal 3 returned no events for this DID.</p> : null}
          </CardContent>
        </Card>

        <Card className="bg-[#ff9d2e]">
          <CardHeader>
            <CircleDollarSign className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Token usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="code-type text-xs uppercase tracking-[0.15em]">Current balance</p>
            <p className="display-type mt-2 text-6xl font-extrabold">{presentedUsage.balance}</p>
            <div className="mt-7 space-y-3">
              {presentedUsage.entries.map((entry) => (
                <div key={entry.id} className="border-2 border-black bg-white p-3">
                  <div className="flex justify-between gap-4">
                    <span className="font-bold">{entry.reason}</span>
                    <span className="font-mono text-xs">{entry.amount}</span>
                  </div>
                  <p className="mt-2 font-mono text-[10px]">{entry.occurredAt}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
