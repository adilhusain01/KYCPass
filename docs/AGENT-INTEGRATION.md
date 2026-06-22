# Agent integration

KYCPass exposes the protected KYC disclosure action through both a REST Agent
Action API and an MCP server. The executing principal is the configured
KYCPass `did:t3n` agent. An external AI agent orchestrates the action, but it
never receives the user's wallet private key, OTP, source document, protected
profile, verifier secret, or resolved claim values.

## Authorization model

There are two independent authorization layers:

1. The calling agent authenticates to KYCPass with
   `KYCPASS_AGENT_ACCESS_TOKEN`.
2. Terminal 3 checks that the user previously signed a grant binding the
   KYCPass agent DID, `kyc-disclosure` contract, `submit-kyc-proof` function,
   contract version, and verifier host.

The bearer token permits a caller to request an action. It cannot replace or
expand the Terminal 3 user grant. A missing, expired, mismatched, or revoked
grant causes contract execution to fail.

## Discover capabilities

```http
GET /api/agent/v1/capabilities
```

The response advertises the agent DID, Terminal 3 environment, contract and
function boundary, supported claim IDs, authentication method, result type,
and privacy guarantees. It contains no secrets.

## Execute an action

```http
POST /api/agent/v1/actions/disclose
Authorization: Bearer <KYCPASS_AGENT_ACCESS_TOKEN>
Content-Type: application/json
```

```json
{
  "action": "kyc.disclose",
  "invocationId": "4ae03c51-f1b9-4c7f-9acc-a3ec70d5d2e7",
  "request": {
    "requestId": "64bb4058-591c-49ac-9674-4183d98c7ea0",
    "userDid": "did:t3n:0123456789abcdef0123456789abcdef01234567",
    "requirement": {
      "id": "bank-identity-check",
      "verifierName": "Northstar Digital Bank",
      "verifierOrigin": "https://bank.example",
      "verifierUrl": "https://bank.example/api/kycpass/verifier",
      "purpose": "Verify identity before opening a regulated bank account.",
      "requestedClaims": ["full_name", "verified_email", "country_of_residence"],
      "expiresAt": "2026-06-22T23:00:00.000Z"
    },
    "approvedClaims": ["full_name", "verified_email", "country_of_residence"]
  }
}
```

Successful responses contain the invocation ID, the KYCPass agent DID, and a
sanitized verifier receipt. They never contain the resolved claim values.

## MCP server

The stdio MCP server exposes:

- `kycpass_get_capabilities`: read the agent identity, action boundary, and
  supported claim catalog.
- `kycpass_disclose`: request the protected Terminal 3 disclosure action.

Run it locally against the deployed API:

```bash
KYCPASS_API_ORIGIN=https://kyc-pass.vercel.app \
KYCPASS_AGENT_ACCESS_TOKEN=<agent-access-token> \
pnpm mcp:start
```

Example MCP host configuration:

```json
{
  "mcpServers": {
    "kycpass": {
      "command": "pnpm",
      "args": ["--dir", "/absolute/path/to/KYCPass", "mcp:start"],
      "env": {
        "KYCPASS_API_ORIGIN": "https://kyc-pass.vercel.app",
        "KYCPASS_AGENT_ACCESS_TOKEN": "<agent-access-token>"
      }
    }
  }
}
```

## Agent workflow

1. Call `kycpass_get_capabilities`.
2. Obtain a typed partner requirement from `/api/partners/kyc-request`.
3. Confirm the user has approved the displayed claim set and Terminal 3 grant
   in the KYCPass browser flow.
4. Call `kycpass_disclose` with the same requirement and approved claims.
5. Use the sanitized receipt as completion evidence.

The agent must not ask the user for a wallet private key. Self-custody users
approve grants through MetaMask; the KYCPass server authenticates only its own
developer/agent DID with the server-held Terminal 3 key.

## Production hardening

The hackathon implementation uses one server-managed bearer token for the
Agent Action API. A multi-agent production service should replace it with
registered agent DIDs, challenge-response authentication, per-agent quotas,
nonce persistence, and a verifier allowlist. Those controls authenticate and
meter callers; they do not replace Terminal 3's user grant.
