# KYCPass

KYCPass is a real Terminal 3 testnet disclosure agent. A user authenticates with
MetaMask, verifies email through Terminal 3 OTP, creates a protected Level-1
profile, and approves a narrowly scoped agent grant. A Rust WASI Preview 2
contract then resolves only the approved profile placeholders inside the
Terminal 3 TEE and sends them directly to the verifier. KYCPass receives a
sanitized receipt, not the claim values.

There are no mock identities, simulated platform calls, or fabricated Level-2
results.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Neobrutalism components
- Zustand, Zod, React Hook Form, Lucide React
- `@terminal3/t3n-sdk` 3.5.2
- Rust, `wit-bindgen`, WASI Preview 2
- Vitest and Playwright

## Local setup

Prerequisites: Node 20+, pnpm, Rust, MetaMask, and a Terminal 3 developer key/DID.

```bash
pnpm install
rustup target add wasm32-wasip2
cp .env.example .env.local
```

Set every value in `.env.local`. `NEXT_PUBLIC_VERIFIER_ORIGIN` must be the
public HTTPS origin used by the deployed verifier for live TEE egress.

```bash
pnpm dev
```

Open `http://localhost:3000`, then use the onboarding screen to connect
MetaMask. OTP codes and wallet signatures are entered by the user during the
live flow.

### Browser session troubleshooting

Terminal 3 browser sessions are node-local and use a `GCLB` load-balancer
affinity cookie. KYCPass sends browser SDK traffic through the allowlisted
same-origin `/api/t3` relay so modern browser cross-site cookie policies do not
break that affinity. If OTP still returns `401 Session not found`, click
**Reconnect Terminal 3 session** and request a new OTP because verification is
bound to the session that requested it. The onboarding screen includes a
sanitized Terminal 3 diagnostic timeline for debugging.

The relay permits only the SDK operations required by the browser flow:
`GET /status`, `GET /api/contracts/current`, and `POST /api/rpc`.

## Contract

```bash
pnpm contract:test
pnpm contract:clippy
pnpm contract:build
pnpm t3:deploy
pnpm t3:check
```

The deployment command authenticates with the developer key, claims the tenant
when needed, and registers
`z:<developer-did-hex>:kyc-disclosure@0.1.0`. It never prints the key or verifier
secret.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

The browser smoke suite does not fake MetaMask. The complete wallet/OTP path is
run manually or in CI with a real wallet extension profile and human-provided
OTP. See [docs/DEMO.md](docs/DEMO.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Security and privacy](docs/SECURITY.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Testing guide](docs/TESTING.md)
- [Hackathon submission copy](docs/SUBMISSION.md)
- [Demo script and recording checklist](docs/DEMO.md)
- [Final handover](docs/HANDOVER.md)

## Current scope

Level 1, consent, TEE disclosure, receipt, audit, and usage are implemented.
Level-2 status is read and displayed only when Terminal 3 genuinely returns it.
Level-2 initiation and the Chrome extension remain outside the judged core
because no public initiation API is used and the web flow must remain the
stable security boundary.
