"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  FileCheck2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { requirementSchema, type ClaimId } from "@/lib/domain";
import { useWorkflowStore } from "@/store/workflow-store";

const NORTHSTAR_NAME = "Northstar Digital Bank";
const NORTHSTAR_CLAIMS: ClaimId[] = ["full_name", "verified_email", "country_of_residence"];

function isNorthstarReceipt(
  receipt: ReturnType<typeof useWorkflowStore.getState>["receipt"],
) {
  return Boolean(
    receipt &&
      receipt.verifier === NORTHSTAR_NAME &&
      NORTHSTAR_CLAIMS.every((claim) => receipt.disclosedClaims.includes(claim)),
  );
}

export default function NorthstarPage() {
  const router = useRouter();
  const userDid = useWorkflowStore((state) => state.userDid);
  const levelOneIssued = useWorkflowStore((state) => state.levelOneIssued);
  const receipt = useWorkflowStore((state) => state.receipt);
  const setRequirement = useWorkflowStore((state) => state.setRequirement);
  const verified = isNorthstarReceipt(receipt);

  function startVerification() {
    if (!userDid || !levelOneIssued) {
      router.push("/onboarding");
      return;
    }

    const origin = window.location.origin;
    setRequirement(
      requirementSchema.parse({
        id: `northstar-${crypto.randomUUID()}`,
        verifierName: NORTHSTAR_NAME,
        verifierOrigin: origin,
        purpose: "Open a regulated savings account and satisfy customer identity checks.",
        requestedClaims: NORTHSTAR_CLAIMS,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        returnPath: "/northstar",
      }),
    );
    router.push("/consent");
  }

  return (
    <div className="min-h-dvh bg-[#f4f1e8] text-[#12231d]">
      <header className="border-b border-[#12231d]/15 bg-[#0c352b] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/northstar" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-[#d9ff70] text-[#0c352b]">
              <Building2 className="size-5" strokeWidth={2.4} />
            </span>
            <span className="text-xl font-extrabold tracking-[-0.03em]">Northstar</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/75 md:flex">
            <span className="text-white">Overview</span>
            <span>Payments</span>
            <span>Documents</span>
            <span>Support</span>
          </nav>
          <button className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold">
            <CircleUserRound className="size-5" />
            <span className="hidden sm:inline">My account</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#12231d]/15 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#44635a]">Personal banking</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.05em] sm:text-6xl">
              Complete your banking profile.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
            <LockKeyhole className="size-4 text-[#19735b]" /> Secure account
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.62fr_1.38fr]">
          <aside className="rounded-3xl bg-[#0c352b] p-6 text-white sm:p-8">
            <div className="flex items-center gap-4 border-b border-white/15 pb-6">
              <span className="grid size-12 place-items-center rounded-full bg-[#d9ff70] font-extrabold text-[#0c352b]">AH</span>
              <div>
                <p className="font-bold">Account applicant</p>
                <p className="mt-1 text-sm text-white/60">Savings account</p>
              </div>
            </div>
            <div className="mt-6 grid gap-2">
              {[
                [WalletCards, "Account overview"],
                [CircleUserRound, "Personal details"],
                [ShieldCheck, "Identity verification"],
                [FileCheck2, "Documents"],
              ].map(([Icon, label], index) => {
                const MenuIcon = Icon as typeof WalletCards;
                return (
                  <div
                    key={label as string}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold ${
                      index === 2 ? "bg-white text-[#0c352b]" : "text-white/70"
                    }`}
                  >
                    <span className="flex items-center gap-3"><MenuIcon className="size-5" />{label as string}</span>
                    {index === 2 ? <ChevronRight className="size-4" /> : null}
                  </div>
                );
              })}
            </div>
            <div className="mt-16 flex items-center gap-3 text-sm font-semibold text-white/55">
              <LogOut className="size-4" /> Sign out
            </div>
          </aside>

          <section className="rounded-3xl border border-[#12231d]/15 bg-white p-6 shadow-[0_18px_60px_rgba(12,53,43,0.08)] sm:p-10">
            {verified && receipt ? (
              <div>
                <div className="grid size-16 place-items-center rounded-full bg-[#d9ff70] text-[#0c352b]">
                  <BadgeCheck className="size-8" strokeWidth={2.2} />
                </div>
                <h2 className="mt-7 text-4xl font-extrabold tracking-[-0.045em]">Identity verified</h2>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-[#44635a]">
                  Northstar accepted a KYCPass proof. Your identity fields were delivered to the
                  verification endpoint, and this profile retained only the sanitized receipt.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {receipt.disclosedClaims.map((claim) => (
                    <div key={claim} className="rounded-2xl border border-[#12231d]/15 bg-[#f4f1e8] p-5">
                      <Check className="size-5 text-[#19735b]" />
                      <p className="mt-4 font-bold">
                        {claim === "full_name"
                          ? "Legal name"
                          : claim === "verified_email"
                            ? "Verified email"
                            : "Country of residence"}
                      </p>
                      <p className="mt-1 text-sm text-[#44635a]">Confirmed</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl border border-[#12231d]/15 p-5 text-sm">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <span className="font-semibold text-[#44635a]">KYCPass receipt</span>
                    <span className="break-all font-mono text-xs">{receipt.receiptId}</span>
                  </div>
                  <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[#12231d]/10 pt-4 sm:flex-row">
                    <span className="font-semibold text-[#44635a]">Verified</span>
                    <span>{new Date(receipt.verifiedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="grid size-16 place-items-center rounded-full bg-[#fff0b8] text-[#7b5300]">
                    <ShieldCheck className="size-8" strokeWidth={2.2} />
                  </div>
                  <span className="rounded-full bg-[#fff0b8] px-4 py-2 text-sm font-bold text-[#7b5300]">
                    Action required
                  </span>
                </div>
                <h2 className="mt-7 text-4xl font-extrabold tracking-[-0.045em]">Verify your identity</h2>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-[#44635a]">
                  Northstar needs three identity claims to activate this savings account. KYCPass
                  will show the exact request before anything is disclosed.
                </p>
                <div className="mt-8 divide-y divide-[#12231d]/10 rounded-2xl border border-[#12231d]/15">
                  {[
                    ["Legal name", "Match the name on your verified identity document"],
                    ["Verified email", "Confirm a reachable account contact"],
                    ["Country of residence", "Apply the correct account eligibility rules"],
                  ].map(([title, description]) => (
                    <div key={title} className="flex gap-4 p-5">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#e4f2ed] text-[#19735b]">
                        <Check className="size-4" />
                      </span>
                      <div>
                        <p className="font-bold">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#44635a]">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {!userDid || !levelOneIssued ? (
                  <div className="mt-6 rounded-2xl bg-[#f4f1e8] p-5 text-sm leading-6 text-[#44635a]">
                    Complete KYCPass onboarding first. Northstar will not ask you to upload or type
                    identity data into this bank profile.
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={startVerification}
                  className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#0c352b] px-6 font-bold text-white transition-colors hover:bg-[#155344]"
                >
                  {!userDid || !levelOneIssued ? "Set up KYCPass" : "Verify with KYCPass"}
                  <ArrowRight className="size-5" />
                </button>
                <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-[#62776f]">
                  <LockKeyhole className="size-4" /> You approve every claim on KYCPass
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="mt-10 flex flex-col justify-between gap-3 border-t border-[#12231d]/15 pt-6 text-xs text-[#62776f] sm:flex-row">
          <span>Northstar Digital Bank is a demonstration relying party.</span>
          <span>Verification powered by KYCPass and Terminal 3</span>
        </footer>
      </main>
    </div>
  );
}
