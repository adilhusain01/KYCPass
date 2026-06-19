# Testing KYCPass

## 1. Static and automated checks

Run these before opening the browser:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm contract:test
pnpm contract:clippy
pnpm contract:build
pnpm build
pnpm test:e2e
pnpm t3:check
```

Expected result:

- TypeScript, ESLint, Vitest, Rust tests, Clippy, WASM build, Next build, and
  Playwright should pass.
- `pnpm t3:check` should print `authenticated: true`, `didMatches: true`,
  `scriptVersionMatches: true`, and `balanceAvailable: true`.
- `verifierTeeReachable` is allowed to be `false` for local testing with
  `http://localhost:3000`; final TEE disclosure requires a public HTTPS origin.

## 2. Local browser flow

Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000/onboarding`.

1. Connect MetaMask.
2. Confirm the wallet session card shows a real `did:t3n`.
3. Enter an email and send Terminal 3 OTP.
4. Enter the received OTP.
5. Select an unzipped UIDAI Offline e-KYC XML, confirm the
   signature-verification success state, confirm every mapped identity field is
   read-only, and submit it. A modified XML must be rejected. There is no
   manual identity-entry fallback.
6. Confirm the KYC card shows `t3n.user-input.kyc.1`.
7. Reload the page and reconnect MetaMask. The DID-specific completion markers
   should restore without showing email or profile field values.
8. Open `/credentials` and refresh Level 2. If no provider session exists, the
   expected result is "Not initiated"; KYCPass must not fabricate approval.
9. Open `/verifier`, choose claims, and create a consent request.

On localhost, the consent page intentionally blocks final TEE execution before
MetaMask grant approval because Terminal 3 cannot call your laptop's localhost.

## 3. Final public HTTPS TEE test

Deploy the Next.js app to a public HTTPS origin and set:

```env
NEXT_PUBLIC_VERIFIER_ORIGIN=https://your-public-origin.example
```

Use the same value in the hosting environment and rerun:

```bash
pnpm t3:check
```

Then test:

1. Complete onboarding on the deployed site.
2. Create a verifier request.
3. Inspect the consent page. The host must match the deployed hostname.
4. Approve the MetaMask grant.
5. Execute the disclosure.
6. Confirm `/receipt` shows only receipt metadata and claim names, never claim
   values.
7. Open `/audit` and fetch telemetry. Token usage should load. Audit events may
   be an empty Terminal 3 response for the DID; the UI must show that directly
   and must not synthesize events.

Before or after the browser run, execute the deployed health probes:

```bash
curl -fsS https://your-public-origin.example/api/config
curl -fsS https://your-public-origin.example/api/agent/overview
curl -fsS https://your-public-origin.example/api/disclosures/execute
```

`GET /api/disclosures/execute` is a non-disclosing server-agent probe. It proves
the deployed function can authenticate and load the Terminal 3 execution stack.
The only route that performs a user disclosure is the consent-driven `POST`.

## 4. Security spot checks

- `/api/config` must not include `T3N_API_KEY` or `KYCPASS_VERIFIER_SECRET`.
- `/api/verifier/submit` must return `401` without `x-kycpass-contract-secret`.
- `/api/t3/api/admin` must return `404`.
- `GET /api/disclosures/execute` must not include claim values, profile fields,
  OTPs, wallet addresses, or secrets.
- Browser local storage may contain `kycpass-did-progress`, but it must not
  contain OTPs, email addresses, wallet addresses, profile fields, signatures,
  or Terminal 3 session material.
- Browser network requests must not contain the imported UIDAI XML, signature,
  photo, DOB, reference ID, or Aadhaar number.
