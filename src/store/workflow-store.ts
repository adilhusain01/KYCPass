"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DisclosureReceipt, KycRequirement } from "@/lib/domain";

type DidProgress = {
  emailVerified: boolean;
  levelOneIssued: boolean;
};

type WorkflowState = {
  address: string | null;
  userDid: string | null;
  otpEmail: string | null;
  emailVerified: boolean;
  levelOneIssued: boolean;
  requirement: KycRequirement | null;
  receipt: DisclosureReceipt | null;
  progressByDid: Record<string, DidProgress>;
  setIdentity: (address: string, userDid: string) => void;
  setOtpEmail: (email: string) => void;
  clearOtpEmail: () => void;
  markEmailVerified: () => void;
  markLevelOneIssued: () => void;
  setRequirement: (requirement: KycRequirement) => void;
  setReceipt: (receipt: DisclosureReceipt) => void;
  reset: () => void;
};

const initialState = {
  address: null,
  userDid: null,
  otpEmail: null,
  emailVerified: false,
  levelOneIssued: false,
  requirement: null,
  receipt: null,
  progressByDid: {},
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set) => ({
      ...initialState,
      setIdentity: (address, userDid) =>
        set((state) => {
          const progress = state.progressByDid[userDid];
          return {
            address,
            userDid,
            otpEmail: null,
            emailVerified: progress?.emailVerified ?? false,
            levelOneIssued: progress?.levelOneIssued ?? false,
            requirement: null,
            receipt: null,
          };
        }),
      setOtpEmail: (otpEmail) => set({ otpEmail }),
      clearOtpEmail: () => set({ otpEmail: null }),
      markEmailVerified: () =>
        set((state) => ({
          emailVerified: true,
          progressByDid: state.userDid
            ? {
                ...state.progressByDid,
                [state.userDid]: {
                  emailVerified: true,
                  levelOneIssued: state.levelOneIssued,
                },
              }
            : state.progressByDid,
        })),
      markLevelOneIssued: () =>
        set((state) => ({
          emailVerified: true,
          levelOneIssued: true,
          progressByDid: state.userDid
            ? {
                ...state.progressByDid,
                [state.userDid]: {
                  emailVerified: true,
                  levelOneIssued: true,
                },
              }
            : state.progressByDid,
        })),
      setRequirement: (requirement) => set({ requirement }),
      setReceipt: (receipt) => set({ receipt }),
      reset: () => set((state) => ({ ...initialState, progressByDid: state.progressByDid })),
    }),
    {
      name: "kycpass-did-progress",
      partialize: (state) => ({ progressByDid: state.progressByDid }),
    },
  ),
);
