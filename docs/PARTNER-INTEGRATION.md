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
    "origin": "https://bank.example"
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
    "verifierOrigin": "https://kyc-pass.vercel.app",
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
5. Execute `POST /api/disclosures/execute`.
6. Store only the returned sanitized receipt in browser state.

Resolved claims are delivered from Terminal 3 to the verifier endpoint inside
the TEE execution path. KYCPass and the sample partner UI retain only the
receipt ID, verifier name, credential level, claim categories, and timestamp.

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
uses the same public request API and `PartnerKycAdapter` component available to
any partner implementation.
