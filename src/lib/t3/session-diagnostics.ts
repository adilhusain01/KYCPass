"use client";

export type SessionDiagnostic = {
  id: number;
  timestamp: string;
  operation: string;
  status: "started" | "success" | "warning" | "error";
  detail: string;
};

type Listener = (events: SessionDiagnostic[]) => void;

const listeners = new Set<Listener>();
let events: SessionDiagnostic[] = [];
let nextId = 1;

function sanitizeDetail(detail: string) {
  return detail
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\b\d{4,12}\b/g, "[code redacted]")
    .replace(/0x[a-f0-9]{40,}/gi, "[wallet redacted]")
    .slice(0, 280);
}

export function classifySessionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/session not found|session expired|session.*no longer usable/i.test(message)) {
    return "Terminal 3 session was not retained by the browser or load balancer.";
  }
  if (/failed to fetch|connection closed|networkerror/i.test(message)) {
    return "Terminal 3 network request failed before a response was received.";
  }
  if (/user rejected|denied|cancelled/i.test(message)) {
    return "Wallet approval was cancelled.";
  }
  return sanitizeDetail(message);
}

export function recordSessionDiagnostic(
  operation: string,
  status: SessionDiagnostic["status"],
  detail: string,
) {
  const event = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    operation,
    status,
    detail: sanitizeDetail(detail),
  };
  events = [...events.slice(-39), event];
  console.info(`[KYCPass:T3] ${operation} ${status}: ${event.detail}`);
  listeners.forEach((listener) => listener(events));
}

export function getSessionDiagnostics() {
  return events;
}

export function subscribeSessionDiagnostics(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionDiagnostics() {
  events = [];
  listeners.forEach((listener) => listener(events));
}
