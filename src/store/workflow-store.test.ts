import { beforeEach, describe, expect, it } from "vitest";

import { useWorkflowStore } from "@/store/workflow-store";

const DID_A = "did:t3n:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DID_B = "did:t3n:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("workflow completion cache", () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkflowStore.setState({
      address: null,
      userDid: null,
      otpEmail: null,
      emailVerified: false,
      levelOneIssued: false,
      requirement: null,
      receipt: null,
      progressByDid: {},
      receiptsByDid: {},
    });
  });

  it("restores only non-PII completion markers for the authenticated DID", () => {
    const store = useWorkflowStore.getState();
    store.setIdentity("0xaaa", DID_A);
    useWorkflowStore.getState().setOtpEmail("person@example.com");
    useWorkflowStore.getState().markEmailVerified();
    useWorkflowStore.getState().markLevelOneIssued();

    const persisted = localStorage.getItem("kycpass-did-progress");
    expect(persisted).toContain(DID_A);
    expect(persisted).not.toContain("person@example.com");

    useWorkflowStore.getState().setIdentity("0xbbb", DID_B);
    expect(useWorkflowStore.getState()).toMatchObject({
      userDid: DID_B,
      otpEmail: null,
      emailVerified: false,
      levelOneIssued: false,
    });

    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);
    expect(useWorkflowStore.getState()).toMatchObject({
      userDid: DID_A,
      otpEmail: null,
      emailVerified: true,
      levelOneIssued: true,
    });
  });

  it("persists the active public DID and sanitized receipt across reloads", () => {
    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);
    useWorkflowStore.getState().setReceipt({
      receiptId: "6f7280a1-e133-4417-a426-488fdb70a8f1",
      requestId: "8f7280a1-e133-4417-a426-488fdb70a8f1",
      verifier: "Northstar Digital Bank",
      status: "accepted",
      kycLevel: "t3n.user-input.kyc.1",
      disclosedClaims: ["full_name", "verified_email"],
      verifiedAt: "2026-06-18T17:30:00.000Z",
    });

    const persisted = localStorage.getItem("kycpass-did-progress");
    expect(persisted).toContain(DID_A);
    expect(persisted).toContain("0xaaa");
    expect(persisted).toContain("6f7280a1-e133-4417-a426-488fdb70a8f1");
    expect(persisted).not.toContain("person@example.com");
    expect(persisted).not.toContain("443653");
    expect(persisted).not.toContain("Shaheen Bagh");
  });

  it("does not show one DID's receipt after switching to a different DID", () => {
    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);
    useWorkflowStore.getState().setReceipt({
      receiptId: "6f7280a1-e133-4417-a426-488fdb70a8f1",
      requestId: "8f7280a1-e133-4417-a426-488fdb70a8f1",
      verifier: "Northstar Digital Bank",
      status: "accepted",
      kycLevel: "t3n.user-input.kyc.1",
      disclosedClaims: ["full_name"],
      verifiedAt: "2026-06-18T17:30:00.000Z",
    });

    useWorkflowStore.getState().setIdentity("0xbbb", DID_B);
    expect(useWorkflowStore.getState().receipt).toBeNull();

    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);
    expect(useWorkflowStore.getState().receipt?.receiptId).toBe(
      "6f7280a1-e133-4417-a426-488fdb70a8f1",
    );
  });

  it("does not clear the per-DID completion cache on session reset", () => {
    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);
    useWorkflowStore.getState().markLevelOneIssued();

    useWorkflowStore.getState().reset();
    useWorkflowStore.getState().setIdentity("0xaaa", DID_A);

    expect(useWorkflowStore.getState()).toMatchObject({
      emailVerified: true,
      levelOneIssued: true,
    });
  });
});
