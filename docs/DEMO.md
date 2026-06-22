# Demo script

Target length: 2.5 to 3 minutes.

## Agent-focused judging insert

After showing the browser grant for the deployed verifier hostname, open Codex
App and call
`kycpass_get_capabilities`. Point out the real KYCPass agent `did:t3n`, the
`submit-kyc-proof` contract function, supported claims, and the explicit
statement that no user private key or plaintext PII is returned.

Then call `kycpass_disclose` with the already approved partner requirement. The
agent supplies identifiers and intent, Terminal 3 checks the user's grant, the
TEE sends approved values directly to the verifier, and the MCP tool receives
only the sanitized receipt. Frame this as the agent completing the last-mile
identity step without identity entering model context.

Use this sequence during the live demo:

1. In `/northstar`, connect the demo MetaMask identity and approve the scoped
   KYCPass grant. Keep the configured host visible.
2. In Codex App, ask: `Use KYCPass MCP to inspect its capabilities. Do not read
   or request private identity values.`
3. Ask Codex to disclose legal name, verified email, and country of residence
   for the demo `did:t3n`, using the deployed KYCPass origin and a fresh
   15-minute request.
4. Show the MCP result: agent DID, accepted status, receipt ID, claim categories,
   and timestamp. Point out that claim values are absent.
5. Explain that revoking or changing the host grant makes Terminal 3 return
   `grant_egress_denied`; the AI agent cannot override that decision.

## 90-second pitch

"Every regulated platform asks users for the same identity document. That
creates repeated friction for the user, repeated provider integrations for the
platform, and repeated sensitive copies for attackers to target.

KYCPass changes the request from 'upload your document' to 'prove these exact
claims.' A user connects MetaMask, authenticates a real Terminal 3 DID, verifies
email by OTP, and imports a UIDAI Paperless Offline e-KYC file. We verify the
official signature locally, map the supported fields into Terminal 3's
protected Level-1 profile, and discard the source document.

Now imagine a bank needs legal name, verified email, and country of residence.
It embeds KYCPass in its own profile page and requests only those three claims.
The user sees the purpose and signs a grant restricted to our agent, Rust WASI
contract, function, version, and the bank's verifier host.

Terminal 3 executes the contract inside its protected environment, resolves
only the approved profile placeholders, and sends those values directly to the
bank. KYCPass never receives the plaintext identity. We receive this sanitized
receipt proving which categories were accepted.

So the user verifies once, partners avoid document-provider integrations, and
every disclosure is minimal, explicit, and auditable. KYCPass proves the claim
and keeps the document out of the transaction."

## Opening hook

"KYC has become the world's most expensive file-upload form. KYCPass turns it
into a reusable, user-approved API."

## Closing line

"One private identity, many scoped proofs: prove the claim, keep the document."

## Recording sequence

1. Open the Northstar Digital Bank account page. Explain that this is a sample
   partner using KYCPass infrastructure on its own profile page, not a KYCPass
   child flow. Show that the bank asks for three claims, not a document upload.
2. Open KYCPass Onboarding. Connect MetaMask and point out the real `did:t3n`.
3. Request the Terminal 3 email OTP and enter the received code.
4. Import a real UIDAI-signed Offline e-KYC XML, show the local signature check,
   show that the mapped fields are locked, and submit the protected Level-1
   profile. State clearly that the source file is discarded and the credential
   remains honest Level 1.
5. Return to Northstar. In the embedded KYCPass adapter, click **Verify inside
   this platform**. The partner request API creates a fixed, typed request for
   legal name, verified email, and country of residence.
6. Show the adapter claim list, the declared bank purpose, and the grant
   boundary in the browser trace.
7. Approve the MetaMask signature and execute `submit-kyc-proof`.
8. Show the accepted receipt on the bank page. The profile now displays
   **Identity verified** using only the receipt ID, claim categories, and
   timestamp. Emphasize that raw values are absent from browser state.
9. Open KYCPass Audit and show token usage. If Terminal 3 returns no audit events for
   the DID, state that exact result and use the receipt plus usage movement as
   the live evidence.
10. End on the architecture diagram and the phrase: "Prove the claim. Keep the
    document."

## Recording checklist

- Use a fresh testnet wallet profile with enough test tokens.
- Set browser zoom to 90% or 100%.
- Hide bookmarks, unrelated tabs, notifications, email addresses, and wallet
  balances not needed for the demo.
- Pre-deploy the web app and contract.
- Confirm the public verifier origin matches the grant hostname.
- Confirm OTP delivery before recording.
- Clear previous receipt and workflow state by reloading the session.
- Keep the browser network panel closed to avoid accidental PII capture.
- Run the deployed health probes from `docs/DEPLOYMENT.md` before recording.
- Record architecture as a separate clean insert if necessary.
- Do not edit around a failed platform call in a way that implies success.

## Real-flow test sheet

Record the date, wallet address, user DID, agent DID, contract version, deployed
origin, receipt ID, token balance before/after, and audit event IDs if Terminal
3 returns them. Do not record OTPs, profile fields, private keys, API keys, or
verifier secrets.
