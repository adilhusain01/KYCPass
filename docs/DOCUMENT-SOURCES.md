# Official document sources

KYCPass separates document acquisition from Terminal 3 disclosure. A source
adapter verifies an issuer artifact and normalizes only the fields supported by
the protected Terminal 3 Level-1 profile. The original document is not a
disclosure claim and is never sent to the verifier.

## Live adapter: UIDAI Offline e-KYC

The onboarding screen accepts UIDAI's compact `OKY` and full
`OfflinePaperlessKyc` Aadhaar Paperless Offline e-KYC XML formats after the
user unzips the file locally. The browser:

1. rejects malformed XML, DTDs, entities, oversized files, and missing fields;
2. verifies the `SHA256withRSA` signature with UIDAI's published 2026-2029
   Offline e-KYC public key;
3. maps only name, address, country of residence, and document country;
4. shows the mapped values as read-only for review;
5. submits those values through the encrypted Terminal 3 browser session; and
6. discards the XML, signature, photo, DOB, reference ID, and all other source
   data.

This verifies source integrity locally. Terminal 3 still honestly labels the
result `t3n.user-input.kyc.1`; KYCPass does not claim that the local import is a
Terminal 3 Level-2 provider approval.

### UIDAI-to-Terminal 3 mapping

| UIDAI source | Validation | Terminal 3 destination |
| --- | --- | --- |
| `Poi.name` or `OKY.n` | Required, covered by UIDAI signature | `first_name`, `last_name` |
| `Poa.*` or `OKY.a` | Required address components, covered by signature | `address` |
| UIDAI document jurisdiction | Fixed Indian issuer context | `document_issuance_country=IN` |
| `Poa.country` or compact UIDAI context | Must resolve to India | `country_of_residence=IN` |
| `Poi.dob` / `OKY.d` | Shape validated and signature-covered | Not persisted: no canonical T3 Level-1 field |
| `Poi.gender` / `OKY.g` | Shape validated and signature-covered | Not persisted: no canonical T3 Level-1 field |
| `Poi.e`, `Poi.m` / `OKY.e`, `OKY.m` | Hash presence validated | Not persisted; Terminal 3 email is proven separately by OTP |
| `Pht` / `OKY.i` | Presence validated and signature-covered | Not persisted or rendered |
| `referenceId` / `OKY.r` | Required and signature-covered | Not persisted or rendered |

The full source schema lives in
`src/lib/document-sources/aadhaar-offline.ts`. The normalized provider boundary
is `src/lib/document-sources/types.ts`. Adding fields to the protected profile
requires both documented Terminal 3 contract support and a new disclosure
policy; silently sending arbitrary UIDAI fields is not accepted.

Official references:

- https://uidai.gov.in/en/ecosystem/authentication-devices-documents/about-aadhaar-paperless-offline-e-kyc.html
- https://uidai.gov.in/en/916-developer-section/data-and-downloads-section/19388-uidai-certificate-details-2.html

## DigiLocker adapter boundary

DigiLocker is the preferred multi-document source for PAN, driving licences,
vehicle registrations, marksheets, and other issuer documents. A real
integration requires KYCPass to be approved as a DigiLocker Requester and to
receive an OAuth client ID, client secret, and registered callback URL. Until
those credentials exist, the application must not simulate a DigiLocker login
or document response.

Once credentials are issued, the adapter should:

1. redirect the user through DigiLocker OAuth/OpenID Connect;
2. list only issued documents available under the approved scopes;
3. let the user select one document and see the requested fields;
4. validate issuer and document metadata;
5. normalize the minimum supported profile fields;
6. submit them to Terminal 3; and
7. immediately discard document bodies and revoke or expire source tokens.

Requester registration and official technical overview:

- https://www.digilocker.gov.in/web/partners/requesters
- https://directory.apisetu.gov.in/api-collection/digilocker

## Adding another provider

Every provider adapter must return the `VerifiedDocumentClaims` boundary in
`src/lib/document-sources/types.ts`. New adapters must provide real issuer
authentication, signature or API-response validation, explicit consent, and a
document-retention policy. A provider logo, uploaded image, or parsed PDF alone
is not verification.

## Compliance boundary

The current adapter is suitable for a user-controlled testnet demonstration,
not an assertion that KYCPass is an approved production Offline Verification
Seeking Entity. Production use requires the applicable UIDAI, DigiLocker, KYC,
privacy, retention, and consent obligations to be reviewed and implemented.
