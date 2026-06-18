# Demo script

Target length: 2.5 to 3 minutes.

## Recording sequence

1. Open the landing page and state the problem: repeated KYC creates repeated
   identity copies.
2. Open Onboarding. Connect MetaMask and point out the real `did:t3n`.
3. Request the Terminal 3 email OTP, enter the received code, and submit the
   Level-1 profile.
4. Open Credentials and show `t3n.user-input.kyc.1`. Refresh Level-2 status only
   to show the genuine current response.
5. Open Verifier. Request legal name, verified email, and country of residence.
6. On Consent, show each selected placeholder and the grant boundary.
7. Approve the MetaMask signature and execute `submit-kyc-proof`.
8. Show the accepted receipt: request ID, verifier, KYC level, claim names, and
   timestamp. Emphasize that values are absent.
9. Open Audit and show the Terminal 3 events and token usage.
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
- Record architecture as a separate clean insert if necessary.
- Do not edit around a failed platform call in a way that implies success.

## Real-flow test sheet

Record the date, wallet address, user DID, agent DID, contract version, deployed
origin, receipt ID, and audit event IDs. Do not record OTPs, profile fields,
private keys, API keys, or verifier secrets.
