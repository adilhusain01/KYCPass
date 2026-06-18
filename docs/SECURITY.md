# Security and privacy

## Guarantees implemented

- `T3N_API_KEY` and `KYCPASS_VERIFIER_SECRET` are parsed only in server modules.
- OTP and Level-1 profile submission use the encrypted Terminal 3 browser SDK
  through an allowlisted same-origin relay. The relay carries opaque encrypted
  payloads but does not decode, inspect, or retain their contents.
- The relay accepts only Terminal 3 `/status`, `/api/contracts/current`, and
  `/api/rpc`, forwards only the `GCLB` affinity cookie, and never logs or stores
  encrypted request bodies.
- MetaMask authentication resolves the same durable Terminal 3 DID on each
  session. Terminal 3 remains authoritative for verified contacts, protected
  profile fields, and issued credentials.
- Zustand keeps active-session identifiers in memory. Its persisted browser
  cache contains only `emailVerified` and `levelOneIssued` markers keyed by
  DID; it never stores wallet addresses, contact values, profile values, OTPs,
  signatures, or Terminal 3 session material.
- The agent receives claim identifiers, not claim values.
- The Rust contract converts identifiers to fixed `{{profile.*}}` placeholders.
- Terminal 3 resolves placeholders after the WASM boundary.
- The verifier records no raw PII and returns only receipt metadata.
- Receipt validation rejects unknown claim identifiers or mismatched bindings.
- Audit presentation drops arbitrary event metadata before rendering.

## Grant boundary

User approval is scoped to:

- the configured KYCPass agent DID;
- the tenant `kyc-disclosure` contract and configured version;
- `submit-kyc-proof`;
- the deployed verifier hostname.

The verifier origin must be HTTPS outside local development. Terminal 3 egress
policy and the user grant both constrain the destination.

## Threat model

**Compromised browser application:** it can request a grant, but MetaMask still
requires user approval. It cannot access the developer key or verifier secret.
The non-PII progress cache is a display optimization and is not accepted as
authorization or proof by the disclosure route.

**Compromised KYCPass server:** it can invoke only grants users have issued. The
contract accepts a fixed claim catalog and Terminal 3 enforces user context and
egress. Server compromise remains serious and requires key rotation.

**Malicious verifier:** it receives only the approved fields and cannot expand
the placeholder set. The contract validates the returned receipt against the
request ID, verifier, KYC level, status, and claim set.

**Logs and error handling:** application code does not log request bodies,
OTPs, profile objects, contract secrets, or resolved values. Production
observability must preserve this restriction. Browser diagnostics contain only
sanitized operation names, outcomes, and generic error classifications.
The disclosure health probe authenticates the server agent and loads the
Terminal 3 execution stack, but it does not accept claim requests or return
profile data.

## Operational requirements

- Store production secrets in the hosting platform secret manager.
- Rotate the developer key and verifier secret after any suspected exposure.
- Use a dedicated HTTPS verifier origin with no third-party request logging.
- Disable body capture in proxies, APM tools, and serverless function logs.
- Review Terminal 3 contract status, grant behavior, token usage, and any audit
  events Terminal 3 returns before each demo.
- Never automate MetaMask using a wallet seed committed to the repository.

## Known boundary

Level-2 initiation is not implemented because KYCPass does not rely on an
undocumented provider initiation API. Genuine status and VC identifiers are
displayed when the SDK returns them.
