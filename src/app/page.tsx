import { ArrowRight, DatabaseZap, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const proofSteps = [
  { number: "01", title: "Connect", text: "MetaMask authenticates a real encrypted Terminal 3 session." },
  { number: "02", title: "Verify once", text: "OTP-bound profile data produces a reusable Level-1 KYC credential." },
  { number: "03", title: "Approve", text: "Every request is narrowed to one agent, function, contract, and host." },
  { number: "04", title: "Disclose", text: "TEE placeholders deliver approved fields directly to the verifier." },
];

const features = [
  { icon: ShieldCheck, title: "Explicit consent", text: "No approval, no execution." },
  {
    icon: DatabaseZap,
    title: "TEE delivery",
    text: "Placeholders resolve after the contract boundary.",
  },
  { icon: EyeOff, title: "Sanitized result", text: "Only claim names and a receipt return." },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border-2 border-black bg-[#1f5eff] p-6 text-white shadow-[7px_7px_0_#111] sm:p-10 lg:p-14">
            <h1 className="display-type max-w-5xl text-[clamp(4rem,10vw,9.5rem)] font-extrabold leading-[0.78]">
              KYC,
              <br />
              without the
              <br />
              document trail.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-white/85">
              Verify identity once. Approve only the claims a service needs. Terminal 3 resolves
              private values inside a hardware-secured enclave and sends them directly to the
              verifier.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#b8ff2c] text-black">
                <Link href="/onboarding">
                  Start real onboarding <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="neutral" className="bg-white text-black">
                <Link href="/northstar">See the bank integration</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            <Card className="bg-[#b8ff2c]">
              <CardContent className="relative min-h-[25rem] overflow-hidden p-6">
                <div className="absolute -right-16 -top-10 rotate-6 border-2 border-black bg-white p-4 shadow-[6px_6px_0_#111]">
                  <Image
                    src="/aadhar.png"
                    width={250}
                    height={161}
                    alt="Illustration representing an Aadhaar-style identity document"
                    priority
                  />
                </div>
                <div className="absolute left-5 top-28 -rotate-6 border-2 border-black bg-white p-3 shadow-[6px_6px_0_#111]">
                  <Image src="/pan.png" width={126} height={126} alt="Illustration representing a PAN-style card" />
                </div>
                <div className="absolute bottom-6 right-7 rotate-3 border-2 border-black bg-white p-3 shadow-[6px_6px_0_#111]">
                  <Image src="/card.png" width={128} height={128} alt="Illustration representing an identity card" />
                </div>
                <div className="relative z-10 max-w-[17rem]">
                  <p className="display-type text-5xl font-extrabold leading-none">
                    FAMILIAR IDS.
                    <br />
                    CLAIMS ONLY.
                  </p>
                  <p className="mt-4 font-semibold leading-7">
                    Aadhaar, PAN, and card-style documents are what people recognize. KYCPass
                    turns the demo back to claim categories, not uploads or stored copies.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="orange-panel justify-between">
              <CardContent>
                <KeyRound className="size-10" strokeWidth={2.4} />
                <p className="display-type mt-10 text-5xl font-extrabold leading-none">ONE DID.</p>
                <p className="mt-4 max-w-sm font-semibold">
                  A real `did:t3n` identity controls encrypted profile data and scoped agent grants.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-y-2 border-black bg-[#b8ff2c]">
        <div className="mx-auto grid max-w-[1480px] md:grid-cols-3">
          {features.map((feature, index) => {
            const FeatureIcon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`p-6 sm:p-8 ${index < 2 ? "border-b-2 border-black md:border-r-2 md:border-b-0" : ""}`}
              >
                <FeatureIcon className="size-8" />
                <h2 className="display-type mt-5 text-3xl font-bold">{feature.title}</h2>
                <p className="mt-2 font-medium">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 max-w-3xl">
          <h2 className="display-type text-5xl font-extrabold sm:text-7xl">Four visible steps. One private path.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {proofSteps.map((step) => (
            <article key={step.number} className="brutal-card min-h-64 p-6">
              <span className="code-type text-5xl font-semibold text-[#1f5eff]">{step.number}</span>
              <h3 className="display-type mt-10 text-4xl font-bold">{step.title}</h3>
              <p className="mt-4 leading-7 text-stone-700">{step.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
