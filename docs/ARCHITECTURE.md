# Architecture

## Components

```mermaid
flowchart LR
    U["User + MetaMask"] --> RP["Partner profile page"]
    AI["AI agent / MCP host"] --> M["KYCPass MCP or Agent API"]
    M --> S["KYCPass did:t3n agent"]
    RP -->|"Embedded adapter"| B["KYCPass browser SDK"]
    RP -->|"Claim request"| API["KYCPass partner API"]
    API --> RP
    B -->|"Encrypted SDK session"| P["Same-origin affinity relay"]
    P -->|"Opaque encrypted RPC + GCLB"| T3["Terminal 3 testnet"]
    S -->|"Developer key auth"| T3
    T3 --> C["kyc-disclosure WASM in TEE"]
    C -->|"Resolved approved claims"| V["Verifier endpoint"]
    V -->|"Sanitized receipt"| C
    C -->|"Receipt only"| S
    S --> B
```

The browser authenticates the end-user DID. The same-origin relay preserves
Terminal 3 node affinity without reading encrypted SDK payloads. The server
authenticates the developer/agent DID. These are separate identities and
separate signing paths.

An external AI agent can orchestrate the same protected action through MCP or
the authenticated Agent Action API. The caller never impersonates the user and
does not receive the user key or protected values. Terminal 3 authorizes the
KYCPass agent DID against the user's existing contract, function, and host
grant before execution.

Partner platforms integrate through `POST /api/partners/kyc-request` and the
browser adapter. Northstar is only a sample partner using that infrastructure.
The partner request defines the organization, purpose, claim IDs, and expiry;
it never includes raw identity values.

Terminal 3 durably binds the protected user record and credentials to the DID.
After a fresh MetaMask authentication, KYCPass restores only non-PII completion
markers from a DID-keyed browser cache so the UI does not incorrectly present
an existing user as new. Those markers are never treated as proof or sent to a
verifier.

## Disclosure sequence

```mermaid
sequenceDiagram
    participant U as User
    participant M as MetaMask
    participant RP as Partner page
    participant B as KYCPass adapter
    participant P as Same-origin relay
    participant S as KYCPass server agent
    participant T as Terminal 3
    participant C as TEE contract
    participant V as Verifier

    U->>RP: Open profile verification
    RP->>B: Load embedded adapter
    U->>B: Connect wallet
    B->>M: Request address and signature
    M-->>B: Approved signature
    B->>P: Encrypted handshake and authenticate
    P->>T: Opaque RPC + affinity cookie
    T-->>P: did:t3n + affinity cookie
    P-->>B: did:t3n
    U->>B: Email and OTP
    B->>P: Encrypted otpRequest / otpVerify
    P->>T: Opaque RPC + affinity cookie
    U->>B: Level-1 profile
    B->>P: Encrypted submitUserInput
    P->>T: Opaque RPC + affinity cookie
    T-->>B: t3n.user-input.kyc.1
    RP->>B: Create partner claim request
    U->>B: Approve exact claim set
    B->>M: Sign scoped agent-auth-update
    M-->>T: Agent + contract + function + host grant
    B->>S: Request approved disclosure
    S->>T: Execute contract with pii_did
    T->>C: Bind user context
    C->>T: http-with-placeholders request
    T->>V: Resolve placeholders and POST inside TEE host
    V-->>C: Sanitized receipt
    C-->>S: Validated receipt
    S-->>B: Receipt only
```

## Data ownership

| Data | Owner and path | KYCPass server access |
|---|---|---|
| Wallet signature | MetaMask to Terminal 3 SDK | No |
| OTP | Browser to Terminal 3 SDK | No |
| Profile fields | Browser to protected user contract | No |
| Completion markers | DID-keyed browser cache, non-authoritative | No |
| Developer key | Server environment | Yes, server only |
| Verifier secret | Server environment to encrypted contract input | Yes, server only |
| Resolved claims | Terminal 3 host to verifier | No |
| Receipt | Verifier to contract to server/browser | Yes, sanitized |

## Deterministic policy

The verifier selects claim identifiers from a fixed catalog. The policy removes
duplicates, rejects unknown identifiers, rejects additions, and requires the
approved set to equal the requested set. An AI parser can later translate prose
into a draft request, but it must never approve claims or execute disclosure.
