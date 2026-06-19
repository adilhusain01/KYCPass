# Partner integration API

KYCPass is the reusable verification layer. A partner platform embeds a small
KYCPass adapter in its own profile or onboarding page and asks only for named
claims. The partner does not need to integrate document providers or Terminal 3
directly.

## Request contract

Create a scoped KYC request:

```http
POST /api/partners/kyc-request
Content-Type: application/json
```

```json
{
  "partner": {
    "id": "northstar-digital-bank",
    "name": "Northstar Digital Bank",
    "origin": "https://bank.example",
    "verifierUrl": "https://bank.example/api/kycpass/verifier"
  },
  "purpose": "Open a regulated savings account and satisfy customer identity checks.",
  "requestedClaims": ["full_name", "verified_email", "country_of_residence"]
}
```

Response:

```json
{
  "requirement": {
    "id": "northstar-digital-bank-...",
    "verifierName": "Northstar Digital Bank",
    "verifierOrigin": "https://bank.example",
    "verifierUrl": "https://bank.example/api/kycpass/verifier",
    "purpose": "Open a regulated savings account and satisfy customer identity checks.",
    "requestedClaims": ["full_name", "verified_email", "country_of_residence"],
    "expiresAt": "2026-06-19T00:00:00.000Z"
  },
  "adapter": {
    "provider": "KYCPass",
    "credential": "t3n.user-input.kyc.1",
    "mode": "embedded",
    "storesRawPii": false,
    "disclosure": "terminal3-tee"
  }
}
```

The request is data-minimized. It contains the partner identity, purpose, claim
IDs, and expiry. It does not contain profile values, document bodies, OTPs,
wallet secrets, or Terminal 3 session material.

## Adapter behavior

The browser adapter performs these steps inside the partner page:

1. Connect MetaMask and authenticate the user DID with Terminal 3.
2. Require the user to complete KYCPass onboarding if no Level-1 credential is
   recorded for that DID.
3. Create the partner request through `/api/partners/kyc-request`.
4. Ask the user to approve a Terminal 3 grant restricted to the KYCPass agent,
   contract, function, contract version, and verifier host.
5. Execute `POST /api/disclosures/execute` on KYCPass.
6. Terminal 3 posts the approved values to the partner's verifier URL.
7. The partner stores only the approved fields it needs for its product and
   returns a sanitized receipt.
8. The adapter stores only the returned receipt in browser state.

Resolved claims are delivered from Terminal 3 to the partner verifier endpoint
inside the TEE execution path. KYCPass retains only the receipt ID, verifier
name, credential level, claim categories, and timestamp.

## Verifier callback

The partner must host a public HTTPS endpoint and pass it as
`partner.verifierUrl`. This is where Terminal 3 sends the approved values after
the user signs the scoped grant.

```http
POST https://bank.example/api/kycpass/verifier
x-kycpass-contract-secret: <shared verifier secret>
Content-Type: application/json
```

```json
{
  "request_id": "77b5a0f8-13a3-4c04-b2f1-a55da1a212ef",
  "verifier_id": "Northstar Digital Bank",
  "purpose": "Open a regulated savings account and satisfy customer identity checks.",
  "claims": {
    "full_name": "Verified User",
    "verified_email": "user@example.com",
    "country_of_residence": "IN"
  }
}
```

The verifier must validate the secret, request ID shape, verifier name, purpose,
and exact claim set before storing or displaying anything. It returns only a
receipt:

```json
{
  "receiptId": "10e98f37-d8b6-4389-9437-b9ad3345b5cc",
  "requestId": "77b5a0f8-13a3-4c04-b2f1-a55da1a212ef",
  "verifier": "Northstar Digital Bank",
  "status": "accepted",
  "kycLevel": "t3n.user-input.kyc.1",
  "disclosedClaims": ["full_name", "verified_email", "country_of_residence"],
  "verifiedAt": "2026-06-19T00:00:00.000Z"
}
```

## External app adapter

For a separately deployed Northstar app, configure the adapter with the KYCPass
origin and the Northstar verifier URL:

```tsx
<PartnerKycAdapter
  kycpassOrigin="https://kyc-pass.vercel.app"
  t3RelayOrigin="https://bank.example"
  partnerId="northstar-digital-bank"
  partnerName="Northstar Digital Bank"
  verifierUrl="https://northstar.example/api/kycpass/verifier"
  purpose="Open a regulated savings account and satisfy customer identity checks."
  requestedClaims={["full_name", "verified_email", "country_of_residence"]}
/>
```

The profile page remains on the partner domain. The user signs the KYCPass grant
from that page, Terminal 3 sends values to the partner verifier endpoint, and
the partner can render the approved details in its profile section.

The partner should expose a same-origin `/api/t3/[...path]` pass-through to the
KYCPass relay and set `t3RelayOrigin` to its own origin. This keeps Terminal 3's
session-affinity cookie first-party in browsers that block third-party cookies.
The complete Next.js route is in `docs/NORTHSTAR-SEPARATE-APP.md`.

## Supported claim IDs

- `full_name`
- `verified_email`
- `country_of_residence`
- `document_issuance_country`
- `address`
- `tax_identifier`

Partners must request the minimum claim set needed for their declared purpose.
KYCPass rejects unknown claims, added claims, and approvals that do not exactly
match the request.

## Sample integration

`/northstar` is not a privileged child app. It is a sample relying party that
uses the same public request API and `PartnerKycAdapter` behavior available to
any partner implementation.
