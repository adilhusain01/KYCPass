type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

export type PresentedAuditEvent = {
  id: string;
  action: string;
  target: string;
  occurredAt: string;
};

export function presentAuditEvents(value: unknown): PresentedAuditEvent[] {
  const page = asRecord(value);
  const batches = Array.isArray(page?.batches) ? page.batches : [];
  const batchEvents = batches.flatMap((candidate) => {
    const batch = asRecord(candidate);
    return batch?.committed === true && Array.isArray(batch.events) ? batch.events : [];
  });
  const candidates =
    batchEvents.length > 0
      ? batchEvents
      : Array.isArray(value)
        ? value
        : Array.isArray(page?.events)
          ? page.events
          : Array.isArray(page?.entries)
            ? page.entries
            : [];

  return candidates.map((candidate, index) => {
    const event = asRecord(candidate) ?? {};
    const action = String(event.action ?? event.event_type ?? event.type ?? "Terminal 3 event");
    const target = String(event.target ?? event.resource ?? event.script_name ?? "Protected resource");
    const rawDate =
      event.created_at ?? event.timestamp ?? event.ts ?? event.occurred_at ?? event.ts_ms;
    return {
      id: String(event.id ?? event.event_id ?? `${action}-${index}`),
      action,
      target,
      occurredAt:
        typeof rawDate === "string"
          ? rawDate
          : typeof rawDate === "number"
            ? new Date(rawDate).toISOString()
            : "Timestamp unavailable",
    };
  });
}

export type PresentedUsage = {
  balance: string;
  entries: Array<{ id: string; reason: string; amount: string; occurredAt: string }>;
};

export function presentUsage(value: unknown): PresentedUsage {
  const page = asRecord(value) ?? {};
  const balance = asRecord(page.balance);
  const rawEntries = Array.isArray(page.entries) ? page.entries : [];
  return {
    balance: String(balance?.available ?? page.balance ?? page.current_balance ?? "Unavailable"),
    entries: rawEntries.map((candidate, index) => {
      const entry = asRecord(candidate) ?? {};
      const rawDate = entry.created_at ?? entry.timestamp ?? entry.ts ?? entry.timestamp_ms;
      return {
        id: String(entry.id ?? entry.tx_id ?? entry.seq_no ?? `usage-${index}`),
        reason: String(entry.reason ?? entry.kind ?? entry.type ?? "Token activity"),
        amount: String(entry.amount ?? entry.credits ?? entry.delta ?? "Unavailable"),
        occurredAt:
          typeof rawDate === "number"
            ? new Date(rawDate).toISOString()
            : String(rawDate ?? "Timestamp unavailable"),
      };
    }),
  };
}
