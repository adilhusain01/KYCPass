# Hackathon submission

## Title

KYCPass: reusable KYC disclosure without reusable copies

## One-line description

KYCPass lets users verify once with Terminal 3 and lets any partner platform
request the minimum required KYC claims through an embedded adapter, under a
MetaMask-approved grant.

## Description

Every service asks users to resubmit the same identity information, creating
copies across forms, databases, support systems, and vendors. KYCPass replaces
that document trail with a user-controlled disclosure flow.

The user authenticates a real Terminal 3 DID with MetaMask, verifies email by
OTP, and creates a protected Level-1 profile. A partner platform requests named
claims, such as legal name, verified email, and country of residence, through
the KYCPass API and browser adapter. KYCPass deterministically computes the
minimum claim set and presents the exact grant: agent DID, TEE contract,
function, contract version, and verifier host.

After approval, a Rust WASI Preview 2 contract runs in Terminal 3. It sends fixed
profile placeholders through `http-with-placeholders`; Terminal 3 resolves the
approved values after the WASM boundary and posts them directly to the
verifier. The agent gets only a sanitized receipt and Terminal 3 audit/usage
evidence.

No mock identity, fake VC, raw document upload, or simulated platform operation
is used in the judged path.

## Terminal 3 usage

- MetaMask-backed T3 session authentication and `did:t3n`
- Terminal 3 email OTP
- protected user profile ingestion and Level-1 credential
- user-signed `agent-auth-update`
- tenant contract registration and execution
- WASI Preview 2 `http-with-placeholders`
- audit event and token usage APIs
- genuine Level-2 status display when available

## Differentiation

KYCPass is not a form autofiller and does not move plaintext PII through an
agent prompt. The disclosure is a deterministic contract action with explicit
human consent, narrow egress, and a receipt that proves what category of claim
was accepted without returning its value.
