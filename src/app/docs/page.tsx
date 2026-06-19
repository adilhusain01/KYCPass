import {
  BadgeCheck,
  Braces,
  Check,
  Code2,
  FileText,
  LockKeyhole,
  Network,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimCatalog, claimIds } from "@/lib/domain";

const steps = [
  {
    title: "Register the user",
    text: "The user connects MetaMask, receives a real did:t3n, verifies email by Terminal 3 OTP, and saves verified document claims into the protected Terminal 3 profile.",
  },
  {
    title: "Embed the adapter",
    text: "A partner profile page renders the KYCPass adapter and requests only the claim IDs required for its declared purpose.",
  },
  {
    title: "Ask for consent",
    text: "The adapter creates a scoped requirement and asks the user to sign a Terminal 3 grant bound to one agent, contract, function, version, and host.",
  },
  {
    title: "Receive a receipt",
    text: "The partner verifier endpoint receives approved values through the TEE path, persists only what its product needs, and returns a sanitized receipt to KYCPass.",
  },
];

const apiExample = `POST /api/partners/kyc-request
Content-Type: application/json

{
  "partner": {
    "id": "northstar-digital-bank",
    "name": "Northstar Digital Bank",
    "origin": "https://bank.example",
    "verifierUrl": "https://bank.example/api/kycpass/verifier"
  },
  "purpose": "Open a regulated savings account and satisfy customer identity checks.",
  "requestedClaims": ["full_name", "verified_email", "country_of_residence"]
}`;

const adapterExample = `<PartnerKycAdapter
  kycpassOrigin="https://kyc-pass.vercel.app"
  t3RelayOrigin="https://bank.example"
  partnerId="northstar-digital-bank"
  partnerName="Northstar Digital Bank"
  verifierUrl="https://bank.example/api/kycpass/verifier"
  purpose="Open a regulated savings account and satisfy customer identity checks."
  requestedClaims={["full_name", "verified_email", "country_of_residence"]}
/>`;

const verifierExample = `POST https://bank.example/api/kycpass/verifier
x-kycpass-contract-secret: <shared verifier secret>

{
  "request_id": "uuid",
  "verifier_id": "Northstar Digital Bank",
  "purpose": "Open a regulated savings account...",
  "claims": {
    "full_name": "Verified user name",
    "verified_email": "user@example.com",
    "country_of_residence": "IN"
  }
}`;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        title="Integrate KYC without becoming a KYC company."
        description="KYCPass is infrastructure for partner platforms. Users verify once, partners request named claims, and Terminal 3 handles disclosure through a scoped TEE execution path."
        badge="Partner docs"
      />

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-[#1f5eff] text-white">
          <CardHeader>
            <Network className="size-10 text-[#b8ff2c]" />
            <CardTitle className="display-type mt-6 text-5xl font-extrabold">
              What the platform gets
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              "A reusable embedded verification adapter",
              "A typed API for partner claim requests",
              "A partner-owned callback for approved values",
              "A sanitized receipt after verifier acceptance",
              "No Aadhaar XML, OTP, wallet secret, or raw profile storage",
            ].map((item) => (
              <div key={item} className="flex gap-3 border-2 border-white bg-black/20 p-4">
                <Check className="mt-0.5 size-5 shrink-0 text-[#b8ff2c]" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <LockKeyhole className="size-10" />
            <CardTitle className="display-type mt-6 text-5xl font-extrabold">
              What stays private
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-7 text-stone-700">
            <p>
              KYCPass does not ask a partner to upload documents or store identity copies. The
              source document is verified locally during onboarding, mapped into the protected
              Terminal 3 profile, and then discarded.
            </p>
            <p>
              During partner verification, the browser stores only public DID state and sanitized
              receipt metadata. Resolved values move through Terminal 3 to the partner verifier
              endpoint. The partner can then show the approved profile fields inside its own product.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="display-type text-5xl font-extrabold">Integration flow</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} className="brutal-card min-h-72 p-6">
              <span className="code-type text-4xl font-bold text-[#1f5eff]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="display-type mt-8 text-3xl font-bold">{step.title}</h3>
              <p className="mt-4 leading-7 text-stone-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="bg-black text-white">
          <CardHeader>
            <Braces className="size-9 text-[#b8ff2c]" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Request API</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap border-2 border-white bg-[#111] p-4 text-xs leading-6 text-[#b8ff2c]">
              {apiExample}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-[#b8ff2c]">
          <CardHeader>
            <Code2 className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Embedded adapter</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap border-2 border-black bg-white p-4 text-xs leading-6">
              {adapterExample}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <Network className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">
              Partner verifier callback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-base leading-7 text-stone-700">
            <p>
              In a separate Northstar deployment, the profile page stays on the bank domain. KYCPass
              only creates the scoped request and executes the Terminal 3 contract. Terminal 3 posts
              the approved values to Northstar&apos;s verifier URL.
            </p>
            <p>
              Northstar proxies its same-origin <code>/api/t3/*</code> route to KYCPass. This keeps
              Terminal 3 node affinity first-party, including in browsers that block third-party
              cookies.
            </p>
            <p>
              Northstar validates the shared verifier secret, request ID, verifier name, and claim
              set. It may save the approved fields for its account workflow, then returns the
              sanitized receipt shown by KYCPass.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-black text-white">
          <CardHeader>
            <Braces className="size-9 text-[#b8ff2c]" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Callback payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap border-2 border-white bg-[#111] p-4 text-xs leading-6 text-[#b8ff2c]">
              {verifierExample}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="orange-panel">
          <CardHeader>
            <ShieldCheck className="size-9" />
            <CardTitle className="display-type mt-5 text-4xl font-bold">Supported claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7">
              Partners must request the minimum set needed for their purpose. Unknown claims,
              added claims, and partial approvals are rejected.
            </p>
          </CardContent>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {claimIds.map((claim) => (
            <div key={claim} className="border-2 border-black bg-white p-4 shadow-[4px_4px_0_#111]">
              <BadgeCheck className="size-5 text-[#1f5eff]" />
              <h3 className="mt-3 font-bold">{claimCatalog[claim].label}</h3>
              <p className="mt-1 text-sm leading-6 text-stone-700">{claimCatalog[claim].description}</p>
              <p className="code-type mt-3 text-[10px] uppercase tracking-[0.15em]">
                {claim}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-2 border-black bg-white p-6 shadow-[6px_6px_0_#111] sm:p-8">
        <FileText className="size-9" />
        <h2 className="display-type mt-5 text-4xl font-bold">Run the sample integration</h2>
        <p className="mt-3 max-w-3xl leading-7 text-stone-700">
          Northstar is only a sample relying party. It uses the same partner request API and
          adapter flow that another platform would use.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/northstar">Open sample platform</Link>
          </Button>
          <Button asChild size="lg" variant="neutral" className="bg-white">
            <Link href="/onboarding">Create user profile</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
