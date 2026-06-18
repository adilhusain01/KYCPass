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
    expect(persisted).not.toContain("0xaaa");

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
