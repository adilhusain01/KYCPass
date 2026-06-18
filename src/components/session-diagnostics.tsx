"use client";

import { Activity, CircleAlert, CircleCheck, CircleDashed, Trash2 } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  clearSessionDiagnostics,
  getSessionDiagnostics,
  subscribeSessionDiagnostics,
  type SessionDiagnostic,
} from "@/lib/t3/session-diagnostics";
import { cn } from "@/lib/utils";

const emptyDiagnostics: SessionDiagnostic[] = [];

export function SessionDiagnostics() {
  const events = useSyncExternalStore(
    subscribeSessionDiagnostics,
    getSessionDiagnostics,
    () => emptyDiagnostics,
  );

  return (
    <section className="mt-8 border-2 border-black bg-black p-4 text-white shadow-[5px_5px_0_#1f5eff]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="code-type text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8ff2c]">
            Sanitized browser trace
          </p>
          <h2 className="display-type mt-1 text-2xl font-bold">Terminal 3 session diagnostics</h2>
        </div>
        <Button
          type="button"
          size="sm"
          variant="neutral"
          className="bg-white text-black"
          onClick={clearSessionDiagnostics}
          disabled={events.length === 0}
        >
          <Trash2 /> Clear
        </Button>
      </div>

      <p className="mt-3 max-w-3xl text-xs leading-5 text-white/65">
        This trace excludes wallet addresses, email addresses, OTP codes, profile fields, API keys,
        and session identifiers.
      </p>

      <div className="mt-4 max-h-72 space-y-2 overflow-auto">
        {events.length === 0 ? (
          <p className="border border-white/30 p-3 font-mono text-xs text-white/60">
            No Terminal 3 browser operations recorded in this page session.
          </p>
        ) : (
          [...events].reverse().map((event) => {
            const Icon =
              event.status === "success"
                ? CircleCheck
                : event.status === "error"
                  ? CircleAlert
                  : event.status === "warning"
                    ? Activity
                    : CircleDashed;
            return (
              <article
                key={event.id}
                className={cn(
                  "grid gap-2 border p-3 font-mono text-xs sm:grid-cols-[auto_10rem_1fr_auto]",
                  event.status === "error" ? "border-[#ff8ac5]" : "border-white/30",
                )}
              >
                <Icon className="size-4 text-[#b8ff2c]" />
                <strong>{event.operation}</strong>
                <span className="text-white/70">{event.detail}</span>
                <time className="text-white/45">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </time>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
