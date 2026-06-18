import { describe, expect, it } from "vitest";

import { presentAuditEvents, presentUsage } from "@/lib/t3/presentation";

describe("telemetry redaction", () => {
  it("drops unrecognized audit metadata and profile values", () => {
    const presented = presentAuditEvents({
      events: [
        {
          id: "evt-1",
          action: "contract.execute",
          target: "z:tenant:kyc-disclosure",
          created_at: "2026-06-13T12:00:00.000Z",
          input: { email: "alice@example.com" },
        },
      ],
    });

    expect(JSON.stringify(presented)).not.toContain("alice@example.com");
    expect(presented[0]?.action).toBe("contract.execute");
  });

  it("flattens only committed Terminal 3 audit batches", () => {
    const presented = presentAuditEvents({
      batches: [
        {
          committed: true,
          events: [{ action: "kyc.approve", target: "user-profile", ts_ms: 1_718_200_000_000 }],
        },
        {
          committed: false,
          events: [{ action: "rolled-back", target: "user-profile", ts_ms: 1_718_200_000_001 }],
        },
      ],
    });

    expect(presented).toHaveLength(1);
    expect(presented[0]?.action).toBe("kyc.approve");
    expect(presented[0]?.occurredAt).toBe(new Date(1_718_200_000_000).toISOString());
  });

  it("presents only token ledger summary fields", () => {
    const presented = presentUsage({
      balance: 90,
      entries: [{ id: "tx-1", reason: "execute", amount: -10, secret: "hidden" }],
    });
    expect(presented).toEqual({
      balance: "90",
      entries: [
        {
          id: "tx-1",
          reason: "execute",
          amount: "-10",
          occurredAt: "Timestamp unavailable",
        },
      ],
    });
  });

  it("extracts the available balance from Terminal 3 balance rows", () => {
    expect(
      presentUsage({
        balance: { available: 18618, reserved: 0, credit_exhausted: false },
        entries: [{ seq_no: 7, kind: "charge", amount: -3, timestamp_ms: 1_718_200_000_000 }],
      }),
    ).toEqual({
      balance: "18618",
      entries: [
        {
          id: "7",
          reason: "charge",
          amount: "-3",
          occurredAt: new Date(1_718_200_000_000).toISOString(),
        },
      ],
    });
  });
});
