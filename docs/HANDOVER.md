# Handover

## What is complete

- Real MetaMask and Terminal 3 browser authentication
- OTP verification and Level-1 profile submission
- Generic partner request API and embedded verification adapter
- Deterministic verifier request and consent screens for developer testing
- Scoped Terminal 3 grant construction
- Server-side developer agent
- Rust WASI Preview 2 disclosure contract
- Verifier receipt endpoint with no PII persistence
- Credentials, receipt, audit, usage, dashboard, and settings screens
- Unit, Rust, browser smoke, lint, type, and build tooling
- Deployment, architecture, security, submission, and demo documentation

## Live validation status

The deployed public flow has reached an accepted sanitized receipt after a
MetaMask-approved grant. The verifier receipt includes only metadata and claim
category names. Terminal 3 token usage loads on the audit screen; Terminal 3 may
return zero audit events for the DID, and KYCPass renders that response without
fabricating events.

## Actions requiring the owner

1. Add the developer key and DID to `.env.local`.
2. Generate a verifier secret.
3. Deploy the web application to a public HTTPS origin.
4. Build and register the contract with `pnpm t3:deploy`.
5. Complete the live MetaMask and OTP flow.
6. Record the demo using `docs/DEMO.md`.
7. Create the public repository after confirming no secrets are in Git history.

## Post-deploy probes

Run these against the deployed origin after each environment or dependency
change:

```bash
curl -fsS https://your-public-origin.example/api/config
curl -fsS https://your-public-origin.example/api/agent/overview
curl -fsS https://your-public-origin.example/api/disclosures/execute
```

The disclosure `GET` route is a health probe only. The live disclosure remains
the adapter or consent-driven `POST /api/disclosures/execute`.

## Versioning

The web app and contract currently use `0.1.0`. Contract changes require a new
version and a fresh deployment. Keep these values synchronized:

- `T3N_CONTRACT_VERSION`
- `contracts/kyc-disclosure/Cargo.toml`
- `CONTRACT_VERSION` in Rust
- WIT package version

## Deferred work

- Chrome extension, after the web flow passes live testnet verification
- documented Level-2 initiation, when Terminal 3 publishes the provider API
- production verifier persistence for non-PII receipt metadata
- automated extension-wallet E2E in a secured CI environment
