# Hackathon submission

## Title

KYCPass: verify once, disclose claims anywhere

## Tagline

Reusable KYC infrastructure that proves the claim without moving the document.

## One-line description

KYCPass lets a user create one wallet-bound private identity and lets any
partner request the minimum KYC claims through a MetaMask-approved Terminal 3
TEE disclosure.

## Concise submission description

KYC still works like file sharing: every bank, exchange, and marketplace asks
the same user to upload the same identity document, creating another sensitive
copy and another integration to maintain.

KYCPass replaces document collection with reusable, consent-driven claim
disclosure. A user authenticates a real Terminal 3 DID with MetaMask, verifies
email through Terminal 3 OTP, and imports a UIDAI Paperless Offline e-KYC file.
The UIDAI signature is verified locally in the browser; supported fields are
mapped into the user's protected Terminal 3 profile, and the source XML is
discarded. Terminal 3 issues the genuine Level-1 credential
`t3n.user-input.kyc.1`.

Any partner can then embed the KYCPass adapter in its own product. The partner
declares a purpose and requests typed claims such as legal name, verified email,
and country of residence. KYCPass deterministically minimizes the request and
presents an exact MetaMask-approved grant bound to one agent DID, Rust WASI
contract, function, version, and verifier host.

Inside Terminal 3, the contract uses `http-with-placeholders` to resolve only
the approved profile fields after the WASM boundary and send them directly to
the partner verifier. The agent never receives plaintext identity data; it gets
only a sanitized receipt describing which claim categories were accepted.

The result is an integration layer for reusable KYC: users verify once,
platforms avoid document-provider plumbing, and every disclosure remains
minimal, explicit, auditable, and user-controlled.

## 100-word version

KYCPass is reusable KYC infrastructure built on Terminal 3. Users authenticate
a wallet-bound `did:t3n`, verify email by OTP, and map a locally
signature-verified UIDAI Offline e-KYC document into a protected Level-1
profile. Partner platforms embed KYCPass and request only named claims, never a
document upload. The user approves an exact MetaMask grant scoped to the agent,
Rust WASI contract, function, version, and verifier host. Terminal 3 resolves
approved profile placeholders inside its TEE and sends values directly to the
partner. KYCPass receives only a sanitized receipt. The result is less repeated
KYC, fewer identity copies, and reusable user-controlled verification.

## Problem

- Users repeatedly upload the same sensitive documents.
- Platforms maintain separate integrations with identity providers.
- Agents and application servers gain unnecessary access to raw PII.
- Consent is usually broad, implicit, and difficult to audit.
- Every retained copy increases breach and compliance exposure.

## Product

- A wallet-bound private identity profile on Terminal 3
- Browser-only verification of supported official document artifacts
- A typed partner API for minimum claim requests
- An embedded adapter that remains inside the partner experience
- MetaMask-approved, host-bound Terminal 3 grants
- A Rust WASI Preview 2 disclosure contract running through the TEE path
- Sanitized receipts, audit responses, and token-usage evidence

## Terminal 3 usage

- MetaMask-backed browser authentication and real `did:t3n`
- Terminal 3 email OTP
- Protected profile ingestion and `t3n.user-input.kyc.1`
- User-signed `agent-auth-update`
- Developer/agent DID authentication
- Tenant contract registration and invocation
- WASI Preview 2 `http-with-placeholders`
- TEE-resolved profile disclosure to a constrained verifier host
- Audit-event and token-usage APIs
- Genuine Level-2 status and VC display when provider-backed results exist

## Use cases

- Bank and fintech customer onboarding
- Exchange and marketplace identity checks
- Residency, jurisdiction, and age-gated access
- Seller, contractor, and workforce verification
- Insurance, telecom, travel, rental, and regulated commerce
- Private AI agents that need authorization without identity access

## Differentiation

KYCPass is not an autofill tool, document vault, or AI prompt carrying PII. The
agent handles claim identifiers; a deterministic contract maps them to fixed
placeholders; Terminal 3 resolves values inside the protected execution path;
and the user approves the exact verifier and scope. No mock identities, fake
VCs, fabricated Level-2 approvals, or simulated successful platform calls are
used in the judged flow.

## Milestones

### Completed

- Real Terminal 3 testnet onboarding with MetaMask and OTP
- UIDAI Offline e-KYC signature verification and protected Level-1 issuance
- Scoped consent and deterministic claim minimization
- Rust WASI Preview 2 contract deployment and TEE execution
- Generic partner API, embedded adapter, and external callback
- Sanitized receipt, audit, usage, diagnostics, and security tests
- Separate partner-deployment architecture and integration documentation

### Next

- Package the adapter as a versioned SDK
- Add registered partners, per-partner keys, and verifier allowlists
- Add DigiLocker after approved requester credentials are available
- Integrate documented Terminal 3 Level-2 provider-session initiation
- Add selective proof policies for age and residency predicates

## Suggested submission links

- Product demo: deployed KYCPass URL
- Sample integration: deployed Northstar URL
- Repository: public repository URL
- Integration docs: `/docs`
- Architecture: `docs/ARCHITECTURE.md`
- Security model: `docs/SECURITY.md`
