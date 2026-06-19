# Separate Northstar deployment

This is the demo shape for a real partner platform:

1. The user creates a KYCPass profile once with MetaMask, Terminal 3 OTP, and a
   supported document source.
2. The user visits Northstar on a separate domain and logs in with the same
   MetaMask account.
3. Northstar renders a KYCPass adapter in its profile page.
4. The adapter creates a scoped request through KYCPass and passes Northstar's
   public verifier callback URL.
5. The user approves the Terminal 3 grant.
6. Terminal 3 resolves approved profile fields inside the TEE and posts them to
   Northstar's verifier endpoint.
7. Northstar saves the approved fields it needs for its account workflow and
   returns a sanitized receipt.

KYCPass does not store the partner's approved profile fields. The partner owns
its profile display after its verifier endpoint receives the callback.

## Profile page configuration

```tsx
import { PartnerKycAdapter } from "@/components/partner-kyc-adapter";

export function ProfileKycPanel() {
  return (
    <PartnerKycAdapter
      kycpassOrigin="https://kyc-pass.vercel.app"
      t3RelayOrigin="https://northstar.example"
      partnerId="northstar-digital-bank"
      partnerName="Northstar Digital Bank"
      verifierUrl="https://northstar.example/api/kycpass/verifier"
      purpose="Open a regulated savings account and satisfy customer identity checks."
      requestedClaims={["full_name", "verified_email", "country_of_residence"]}
      onVerified={(receipt) => {
        console.log("KYCPass receipt", receipt.receiptId);
      }}
    />
  );
}
```

The component shown here can be vendored into the partner app for the hackathon
demo. A production integration should publish it as a small SDK package or a
hosted adapter once the API contract is stable.

`t3RelayOrigin` points at Northstar itself so Terminal 3's node-affinity cookie
is first-party. This avoids Brave and other privacy controls blocking the
session cookie. Northstar must proxy `/api/t3/*` to the matching KYCPass path:

```ts
import { NextResponse } from "next/server";

type Context = { params: Promise<{ path: string[] }> };

async function relay(request: Request, context: Context) {
  const { path } = await context.params;
  const upstream = new URL(
    `/api/t3/${path.join("/")}${new URL(request.url).search}`,
    process.env.KYCPASS_ORIGIN,
  );
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "session-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
  });
  const outputHeaders = new Headers();
  for (const name of ["content-type", "session-id", "set-cookie"]) {
    const value = response.headers.get(name);
    if (value) outputHeaders.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers: outputHeaders });
}

export const GET = relay;
export const POST = relay;
```

Place that route at `app/api/t3/[...path]/route.ts`. Do not point it directly at
Terminal 3; the KYCPass relay owns the upstream allowlist and environment.

## Verifier route

The verifier route runs on Northstar, not KYCPass.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  request_id: z.string().uuid(),
  verifier_id: z.literal("Northstar Digital Bank"),
  purpose: z.string().min(10),
  claims: z.object({
    full_name: z.string().min(1),
    verified_email: z.string().email(),
    country_of_residence: z.string().length(2),
  }),
});

export async function POST(request: Request) {
  const secret = request.headers.get("x-kycpass-contract-secret");
  if (secret !== process.env.KYCPASS_VERIFIER_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = requestSchema.parse(await request.json());

  await saveVerifiedProfile({
    requestId: payload.request_id,
    fullName: payload.claims.full_name,
    email: payload.claims.verified_email,
    country: payload.claims.country_of_residence,
  });

  return NextResponse.json({
    receiptId: crypto.randomUUID(),
    requestId: payload.request_id,
    verifier: payload.verifier_id,
    status: "accepted",
    kycLevel: "t3n.user-input.kyc.1",
    disclosedClaims: ["full_name", "verified_email", "country_of_residence"],
    verifiedAt: new Date().toISOString(),
  });
}
```

Replace `saveVerifiedProfile` with the partner app's database write. Do not log
the raw callback body in production.

## Environment

Northstar needs:

```env
NEXT_PUBLIC_KYCPASS_ORIGIN=https://kyc-pass.vercel.app
NEXT_PUBLIC_NORTHSTAR_VERIFIER_URL=https://northstar.example/api/kycpass/verifier
KYCPASS_ORIGIN=https://kyc-pass.vercel.app
KYCPASS_VERIFIER_SECRET=<same value configured in KYCPass for the demo>
```

For a multi-partner production system, replace the shared demo secret with
per-partner credentials and an allowlisted verifier registry.
