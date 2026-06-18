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
- `/api/t3/status` reaches Terminal 3 and sets a `GCLB` cookie scoped to
  `/api/t3`;
- `/api/t3` rejects every path and method except `GET /status`,
  `GET /api/contracts/current`, and `POST /api/rpc`;
- `/api/verifier/submit` rejects requests without the contract secret;
- HTTPS is active;
- request-body logging is disabled.

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
8. Confirm Terminal 3 audit and usage entries appear.

Testnet execution cannot be completed without the developer key, a public
verifier deployment, user wallet approval, and the human-entered OTP.
