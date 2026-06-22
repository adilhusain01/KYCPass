# Deployment

## 1. Configure

Create `.env.local` from `.env.example`.

`NEXT_PUBLIC_VERIFIER_ORIGIN` must equal the final public origin, for example
`https://kycpass.example`. The grant uses its hostname and the contract sends to
`/api/verifier/submit` on that origin.

Generate `KYCPASS_VERIFIER_SECRET` with at least 32 random bytes:

```bash
openssl rand -hex 32
```

Generate a separate Agent Action API credential:

```bash
openssl rand -hex 32
```

Store that value as `KYCPASS_AGENT_ACCESS_TOKEN`. Do not reuse the Terminal 3
developer key or verifier secret.

## 2. Verify locally

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm contract:test
pnpm contract:clippy
pnpm contract:build
pnpm build
```

## 3. Deploy web application

Deploy the Next.js application to a Node-compatible host and add all environment
variables to its encrypted secret store. Do not expose server variables as
`NEXT_PUBLIC_*`.

Verify:

- `/api/config` returns public identifiers only;
- `GET /api/agent/overview` authenticates the server agent and returns sanitized
  usage/audit/contract status;
- `GET /api/disclosures/execute` authenticates the server agent and loads the
  Terminal 3 execution stack without disclosing user claims;
- `/api/t3/status` reaches Terminal 3 and sets a `GCLB` cookie scoped to
  `/api/t3`;
- `/api/t3` rejects every path and method except `GET /status`,
  `GET /api/contracts/current`, and `POST /api/rpc`;
- `/api/verifier/submit` rejects requests without the contract secret;
- `/api/agent/v1/capabilities` returns the public agent DID and action boundary;
- `/api/agent/v1/actions/disclose` rejects requests without the agent bearer
  token and still fails closed when no matching Terminal 3 user grant exists;
- HTTPS is active;
- request-body logging is disabled.

The Next.js configuration intentionally externalizes `@terminal3/t3n-sdk` and
includes the Bytecode Alliance Preview 2 shim worker files in output tracing for
the server routes that load Terminal 3 WASM. Keep those settings when moving
hosts or changing Next.js versions.

Deployed health probes:

```bash
curl -fsS https://your-public-origin.example/api/config
curl -fsS https://your-public-origin.example/api/agent/overview
curl -fsS https://your-public-origin.example/api/disclosures/execute
```

## 4. Register contract

Run against the same environment and developer DID:

```bash
pnpm t3:deploy
```

Increment both `T3N_CONTRACT_VERSION` and the Rust package/constant/WIT version
for contract changes. Users must approve grants for the version requirement
used by the application.

## 5. Live validation

1. Connect a real MetaMask account.
2. Complete Terminal 3 OTP.
3. Submit a Level-1 profile.
4. Create a verifier request.
5. Inspect and sign the scoped grant.
6. Execute the TEE contract.
7. Confirm the receipt contains no claim values.
8. Fetch `/audit` and confirm token usage loads. If Terminal 3 returns zero
   audit events for the DID, record that exact response rather than inventing
   an event list.

Testnet execution cannot be completed without the developer key, a public
verifier deployment, user wallet approval, and the human-entered OTP.
