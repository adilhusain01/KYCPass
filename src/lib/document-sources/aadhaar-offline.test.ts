import { webcrypto } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyAadhaarOfflineXml } from "./aadhaar-offline";

function toBase64(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64");
}

async function signedFixture() {
  const keys = await webcrypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const unsigned = '<OKY v="1" n="Asha Sharma" a="12 Example Road, New Delhi" r="000020260619000000000"/>';
  const payload = new XMLSerializer().serializeToString(
    new DOMParser().parseFromString(unsigned, "application/xml").documentElement,
  );
  const signature = await webcrypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keys.privateKey,
    new TextEncoder().encode(payload),
  );
  const spki = await webcrypto.subtle.exportKey("spki", keys.publicKey);
  return {
    xml: unsigned.replace("/>", ` s="${toBase64(signature)}"/>`),
    spki: toBase64(spki),
  };
}

describe("Aadhaar Offline e-KYC document source", () => {
  it("verifies a signed compact document and maps only supported profile fields", async () => {
    const fixture = await signedFixture();
    const result = await verifyAadhaarOfflineXml(fixture.xml, fixture.spki);

    expect(result.source).toBe("uidai-offline-ekyc");
    expect(result.profile).toEqual({
      first_name: "Asha",
      last_name: "Sharma",
      country_of_residence: "IN",
      document_issuance_country: "IN",
      address: "12 Example Road, New Delhi",
      ssn: "",
    });
    expect(result).not.toHaveProperty("aadhaarNumber");
  });

  it("rejects a document changed after signing", async () => {
    const fixture = await signedFixture();
    await expect(
      verifyAadhaarOfflineXml(fixture.xml.replace("Asha Sharma", "Asha Modified"), fixture.spki),
    ).rejects.toThrow("signature verification failed");
  });

  it("rejects XML entity declarations", async () => {
    await expect(
      verifyAadhaarOfflineXml('<!DOCTYPE OKY [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><OKY/>'),
    ).rejects.toThrow("DTD and entity declarations");
  });
});
