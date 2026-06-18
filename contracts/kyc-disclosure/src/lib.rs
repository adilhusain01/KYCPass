//! Minimum-disclosure KYC contract for Terminal 3.
//!
//! The caller supplies claim identifiers only. This contract maps those
//! identifiers to `{{profile.*}}` markers and invokes the verifier through
//! `http-with-placeholders`. Terminal 3 resolves the markers outside WASM, so
//! neither the KYCPass agent nor this component receives plaintext profile data.
#![warn(clippy::style, missing_debug_implementations)]
#![cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]

extern crate alloc;

use alloc::{
    collections::BTreeMap,
    string::{String, ToString},
    vec::Vec,
};
use serde::{Deserialize, Serialize};

pub const CONTRACT_VERSION: &str = "0.1.0";

wit_bindgen::generate!({
    world: "kyc-disclosure",
    path: "wit",
    additional_derives: [serde::Deserialize, serde::Serialize],
    generate_all,
});

#[derive(Debug, Deserialize)]
struct DisclosureRequest {
    request_id: String,
    verifier_id: String,
    purpose: String,
    verifier_url: String,
    verifier_secret: String,
    claims: Vec<String>,
}

#[derive(Debug, Serialize)]
struct VerifierSubmission {
    request_id: String,
    verifier_id: String,
    purpose: String,
    claims: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Receipt {
    receipt_id: String,
    request_id: String,
    verifier: String,
    status: String,
    kyc_level: String,
    disclosed_claims: Vec<String>,
    verified_at: String,
}

struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::z::kyc_disclosure::contracts::Guest for Component {
    fn submit_kyc_proof(
        req: exports::z::kyc_disclosure::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input = req.input.ok_or("submit-kyc-proof: missing input")?;
        submit_kyc_proof(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);

fn submit_kyc_proof(input: &[u8]) -> Result<Vec<u8>, String> {
    let request: DisclosureRequest = serde_json::from_slice(input)
        .map_err(|_| "submit-kyc-proof: malformed input".to_string())?;
    validate_request(&request)?;
    let verifier_url = request.verifier_url.clone();
    let verifier_secret = request.verifier_secret.clone();
    let submission = build_submission(request)?;

    #[cfg(target_arch = "wasm32")]
    {
        call_verifier(submission, verifier_url, verifier_secret)
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = (submission, verifier_url, verifier_secret);
        Err("submit-kyc-proof is only implemented on the wasm32 target".to_string())
    }
}

fn validate_request(request: &DisclosureRequest) -> Result<(), String> {
    if request.request_id.len() != 36 {
        return Err("submit-kyc-proof: invalid request id".to_string());
    }
    if request.verifier_id.len() < 2 || request.verifier_id.len() > 100 {
        return Err("submit-kyc-proof: invalid verifier id".to_string());
    }
    if request.purpose.len() < 10 || request.purpose.len() > 300 {
        return Err("submit-kyc-proof: invalid purpose".to_string());
    }
    if !request.verifier_url.starts_with("https://")
        && !request.verifier_url.starts_with("http://localhost:")
    {
        return Err("submit-kyc-proof: verifier URL must use HTTPS".to_string());
    }
    if request.verifier_secret.len() < 24 {
        return Err("submit-kyc-proof: verifier secret missing".to_string());
    }
    if request.claims.is_empty() || request.claims.len() > 6 {
        return Err("submit-kyc-proof: invalid claim count".to_string());
    }
    Ok(())
}

fn build_submission(request: DisclosureRequest) -> Result<VerifierSubmission, String> {
    let mut claims = BTreeMap::new();
    for claim in &request.claims {
        let placeholder = match claim.as_str() {
            "full_name" => "{{profile.first_name}} {{profile.last_name}}",
            "verified_email" => "{{profile.verified_contacts.email.value}}",
            "country_of_residence" => "{{profile.country_of_residence}}",
            "document_issuance_country" => "{{profile.document_issuance_country}}",
            "address" => "{{profile.address}}",
            "tax_identifier" => "{{profile.ssn}}",
            _ => return Err("submit-kyc-proof: unsupported claim".to_string()),
        };
        if claims.insert(claim.clone(), placeholder.to_string()).is_some() {
            return Err("submit-kyc-proof: duplicate claim".to_string());
        }
    }

    Ok(VerifierSubmission {
        request_id: request.request_id,
        verifier_id: request.verifier_id,
        purpose: request.purpose,
        claims,
    })
}

#[cfg(target_arch = "wasm32")]
fn call_verifier(
    submission: VerifierSubmission,
    verifier_url: String,
    verifier_secret: String,
) -> Result<Vec<u8>, String> {
    use crate::host::interfaces::http_with_placeholders as hwp;

    let payload = serde_json::to_vec(&submission)
        .map_err(|_| "submit-kyc-proof: could not serialize request".to_string())?;
    let response = hwp::call(&hwp::Request {
        method: hwp::Verb::Post,
        url: verifier_url,
        headers: Some(alloc::vec![
            ("Accept".to_string(), "application/json".to_string()),
            ("x-kycpass-contract-secret".to_string(), verifier_secret),
        ]),
        payload: Some(payload),
    })
    .map_err(format_http_error)?;

    if response.code != 200 {
        return Err(alloc::format!(
            "submit-kyc-proof: verifier returned HTTP {}",
            response.code
        ));
    }

    let receipt: Receipt = serde_json::from_slice(&response.payload)
        .map_err(|_| "submit-kyc-proof: malformed verifier receipt".to_string())?;
    validate_receipt(&submission, &receipt)?;
    serde_json::to_vec(&receipt)
        .map_err(|_| "submit-kyc-proof: could not serialize receipt".to_string())
}

#[cfg(target_arch = "wasm32")]
fn validate_receipt(submission: &VerifierSubmission, receipt: &Receipt) -> Result<(), String> {
    if receipt.request_id != submission.request_id
        || receipt.verifier != submission.verifier_id
        || receipt.status != "accepted"
        || receipt.kyc_level != "t3n.user-input.kyc.1"
    {
        return Err("submit-kyc-proof: receipt binding failed".to_string());
    }
    let expected: Vec<&str> = submission.claims.keys().map(String::as_str).collect();
    let actual: Vec<&str> = receipt.disclosed_claims.iter().map(String::as_str).collect();
    if expected != actual {
        return Err("submit-kyc-proof: receipt claim set mismatch".to_string());
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn format_http_error(error: crate::host::interfaces::http_with_placeholders::HttpError) -> String {
    use crate::host::interfaces::http_with_placeholders::HttpError;
    match error {
        HttpError::EgressDenied(host) => alloc::format!("submit-kyc-proof: egress denied for {host}"),
        HttpError::PlaceholderDenied(marker) => {
            alloc::format!("submit-kyc-proof: placeholder denied: {marker}")
        }
        HttpError::PlaceholderUnknown(field) => {
            alloc::format!("submit-kyc-proof: profile field unavailable: {field}")
        }
        HttpError::PlaceholderNoUserContext => {
            "submit-kyc-proof: no user context".to_string()
        }
        HttpError::UpstreamError(reason) => {
            alloc::format!("submit-kyc-proof: verifier transport failed: {reason}")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_input(claims: serde_json::Value) -> Vec<u8> {
        serde_json::to_vec(&serde_json::json!({
            "request_id": "6f7280a1-e133-4417-a426-488fdb70a8f1",
            "verifier_id": "Northstar Bank",
            "purpose": "Open a regulated savings account.",
            "verifier_url": "https://verifier.example/api/verifier/submit",
            "verifier_secret": "a-secret-with-at-least-24-characters",
            "claims": claims,
        }))
        .unwrap()
    }

    #[test]
    fn rejects_unknown_claims_before_http() {
        let error = submit_kyc_proof(&valid_input(serde_json::json!(["passport_scan"])))
            .unwrap_err();
        assert!(error.contains("unsupported claim"));
    }

    #[test]
    fn rejects_duplicate_claims() {
        let error = submit_kyc_proof(&valid_input(serde_json::json!([
            "verified_email",
            "verified_email"
        ])))
        .unwrap_err();
        assert!(error.contains("duplicate claim"));
    }

    #[test]
    fn valid_input_reaches_wasm_only_boundary() {
        let error = submit_kyc_proof(&valid_input(serde_json::json!([
            "full_name",
            "country_of_residence"
        ])))
        .unwrap_err();
        assert!(error.contains("only implemented on the wasm32 target"));
    }

    #[test]
    fn contract_version_is_semver() {
        assert_eq!(CONTRACT_VERSION.split('.').count(), 3);
    }
}
