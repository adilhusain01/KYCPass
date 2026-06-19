# Demo script

Target length: 2.5 to 3 minutes.

## Recording sequence

1. Open the Northstar Digital Bank account page. Show that the account is
   blocked on identity verification and that the bank asks for three claims,
   not a document upload.
2. Open KYCPass Onboarding. Connect MetaMask and point out the real `did:t3n`.
3. Request the Terminal 3 email OTP and enter the received code.
4. Import a real UIDAI-signed Offline e-KYC XML, show the local signature check,
   show that the mapped fields are locked, and submit the protected Level-1
   profile. State clearly that the source file is discarded and the credential
   remains honest Level 1.
5. Return to Northstar and click **Verify with KYCPass**. The bank creates a
   fixed, typed request for legal name, verified email, and country of residence.
6. On the KYCPass consent screen, show each selected placeholder, the declared
   bank purpose, and the grant boundary.
8. Approve the MetaMask signature and execute `submit-kyc-proof`.
9. Show the accepted receipt, then return to Northstar. The bank profile now
   displays **Identity verified** using only the receipt ID, claim categories,
   and timestamp. Emphasize that raw values are absent from the browser state.
10. Open KYCPass Audit and show token usage. If Terminal 3 returns no audit events for
   the DID, state that exact result and use the receipt plus usage movement as
   the live evidence.
11. End on the architecture diagram and the phrase: "Prove the claim. Keep the
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
