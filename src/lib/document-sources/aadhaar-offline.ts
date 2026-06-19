import { userProfileSchema } from "@/lib/domain";
import { z } from "zod";
import { SignedXml } from "xmldsigjs";

import type { VerifiedDocumentClaims } from "./types";

// UIDAI Paperless Offline e-KYC key published for 2026-2029.
const UIDAI_OFFLINE_EKYC_SPKI =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAh1+zYnvbcEm0Yz73s5u42odpUJMr9wv5bVw7sOE5nFNbrB+U++5I0f8cL2HoHnJOkwvLZzrD0jG/vxAKi6vii/gjEzUEgrkdIHxMP3D6GJs0MSQHiEXvIGOwPIH3BLtBOc3m28NVNT6Q9iq0gUwuxnlhV38UdNhCllqNYhWmAMPJkImgaKrRZvY2pWNs6gd+PlAF/9SO69x3+1meA8kPk2ZvQanZlx9tfaExeOe9or3NQiKy2+UbtXrpcoAfYbbWi1OUzXi5bJdhbGp239c1fX6UKyUM5IUMY+m3I7wu2WQ7lmeO2n/vwzQz/PKHXPWYu3bydWMLdCi07vOQBqzCKwIDAQAB";

const MAX_XML_BYTES = 1_000_000;
const XMLDSIG_NAMESPACE = "http://www.w3.org/2000/09/xmldsig#";
const ALLOWED_XMLDSIG_ALGORITHMS = new Set([
  "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
  "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
  "http://www.w3.org/2001/04/xmlenc#sha256",
]);

const fullAadhaarSourceSchema = z.object({
  format: z.literal("OfflinePaperlessKyc"),
  referenceId: z.string().min(1),
  poi: z.object({
    name: z.string().min(1),
    dateOfBirth: z.string().min(1),
    gender: z.string().min(1),
    emailHash: z.string().optional(),
    mobileHash: z.string().optional(),
  }),
  poa: z.object({
    careOf: z.string().optional(),
    country: z.string().optional(),
    district: z.string().optional(),
    house: z.string().optional(),
    landmark: z.string().optional(),
    locality: z.string().optional(),
    postalCode: z.string().optional(),
    postOffice: z.string().optional(),
    state: z.string().optional(),
    street: z.string().optional(),
    subdistrict: z.string().optional(),
    villageTownCity: z.string().optional(),
  }),
  photo: z.string().min(1),
});

const compactAadhaarSourceSchema = z.object({
  format: z.literal("OKY"),
  version: z.string().min(1),
  name: z.string().min(1),
  referenceId: z.string().min(1),
  photo: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emailHash: z.string().optional(),
  mobileHash: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().min(1),
});

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    throw new Error("The official document must contain both a given name and family name for the Terminal 3 profile.");
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.at(-1) ?? "",
  };
}

function optionalAttribute(element: Element, name: string) {
  return element.getAttribute(name)?.trim() || undefined;
}

function countSourceFields(value: object) {
  return Object.values(value).reduce((count, item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return count + countSourceFields(item);
    }
    return count + (typeof item === "string" && item.length > 0 ? 1 : 0);
  }, 0);
}

function mapCountryToIso(country: string | undefined) {
  if (country && /^(india|in)$/i.test(country.trim())) return "IN";
  throw new Error("The UIDAI address country is missing or unsupported.");
}

function parseDocument(xml: string) {
  if (new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) {
    throw new Error("The document exceeds the 1 MB local verification limit.");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new Error("DTD and entity declarations are not accepted.");
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("The selected file is not valid XML.");
  }

  return document;
}

function parseCompactDocument(document: Document) {
  const root = document.documentElement;

  const signature = root.getAttribute("s");
  if (!signature) {
    throw new Error("The e-KYC XML must include its UIDAI signature, name, and address fields.");
  }

  const source = compactAadhaarSourceSchema.parse({
    format: "OKY",
    version: root.getAttribute("v")?.trim(),
    name: root.getAttribute("n")?.trim(),
    referenceId: root.getAttribute("r")?.trim(),
    photo: optionalAttribute(root, "i"),
    dateOfBirth: optionalAttribute(root, "d"),
    emailHash: optionalAttribute(root, "e"),
    mobileHash: optionalAttribute(root, "m"),
    gender: optionalAttribute(root, "g"),
    address: root.getAttribute("a")?.trim(),
  });

  root.removeAttribute("s");
  const signedPayload = new XMLSerializer().serializeToString(root);
  return {
    signature,
    name: source.name,
    address: source.address,
    countryCode: "IN",
    signedPayload,
    sourceFieldCount: countSourceFields(source) - 1,
  };
}

function getSingleElement(document: Document, namespace: string, name: string) {
  const elements = document.getElementsByTagNameNS(namespace, name);
  if (elements.length !== 1) {
    throw new Error(`The UIDAI XML must contain exactly one ${name} element.`);
  }
  return elements[0];
}

function buildAddress(poa: z.infer<typeof fullAadhaarSourceSchema>["poa"]) {
  const values = [
    poa.careOf,
    poa.house,
    poa.street,
    poa.landmark,
    poa.locality,
    poa.villageTownCity,
    poa.postOffice,
    poa.subdistrict,
    poa.district,
    poa.state,
    poa.postalCode,
    poa.country,
  ]
    .filter((value): value is string => Boolean(value && !value.startsWith("#")));
  const uniqueValues = [...new Set(values)];
  if (uniqueValues.length === 0) {
    throw new Error("The UIDAI document does not contain an address that Terminal 3 can ingest.");
  }
  return uniqueValues.join(", ");
}

function parseFullDocument(document: Document) {
  const signature = getSingleElement(document, XMLDSIG_NAMESPACE, "Signature");
  const reference = getSingleElement(document, XMLDSIG_NAMESPACE, "Reference");
  if (reference.getAttribute("URI") !== "") {
    throw new Error("External XML signature references are not accepted.");
  }

  const algorithmElements = Array.from(document.querySelectorAll("[Algorithm]"));
  if (
    algorithmElements.length !== 4 ||
    algorithmElements.some((element) => !ALLOWED_XMLDSIG_ALGORITHMS.has(element.getAttribute("Algorithm") ?? ""))
  ) {
    throw new Error("The UIDAI XML uses an unsupported signature algorithm profile.");
  }

  const poi = document.getElementsByTagName("Poi");
  const poa = document.getElementsByTagName("Poa");
  if (poi.length !== 1 || poa.length !== 1) {
    throw new Error("The UIDAI XML must contain exactly one Poi and one Poa element.");
  }
  const name = poi[0].getAttribute("name")?.trim();
  const source = fullAadhaarSourceSchema.parse({
    format: "OfflinePaperlessKyc",
    referenceId: document.documentElement.getAttribute("referenceId")?.trim(),
    poi: {
      name,
      dateOfBirth: poi[0].getAttribute("dob")?.trim(),
      gender: poi[0].getAttribute("gender")?.trim(),
      emailHash: optionalAttribute(poi[0], "e"),
      mobileHash: optionalAttribute(poi[0], "m"),
    },
    poa: {
      careOf: optionalAttribute(poa[0], "careof"),
      country: optionalAttribute(poa[0], "country"),
      district: optionalAttribute(poa[0], "dist"),
      house: optionalAttribute(poa[0], "house"),
      landmark: optionalAttribute(poa[0], "landmark"),
      locality: optionalAttribute(poa[0], "loc"),
      postalCode: optionalAttribute(poa[0], "pc"),
      postOffice: optionalAttribute(poa[0], "po"),
      state: optionalAttribute(poa[0], "state"),
      street: optionalAttribute(poa[0], "street"),
      subdistrict: optionalAttribute(poa[0], "subdist"),
      villageTownCity: optionalAttribute(poa[0], "vtc"),
    },
    photo: document.getElementsByTagName("Pht")[0]?.textContent?.trim(),
  });
  return {
    signature,
    name: source.poi.name,
    address: buildAddress(source.poa),
    countryCode: mapCountryToIso(source.poa.country),
    sourceFieldCount: countSourceFields(source) - 1,
  };
}

export async function verifyAadhaarOfflineXml(
  xml: string,
  publicKeySpki = UIDAI_OFFLINE_EKYC_SPKI,
): Promise<VerifiedDocumentClaims> {
  const document = parseDocument(xml);
  const publicKey = await crypto.subtle.importKey(
    "spki",
    decodeBase64(publicKeySpki),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"],
  );
  const rootName = document.documentElement.localName;
  let name: string;
  let address: string;
  let countryCode: string;
  let sourceFieldCount: number;
  let verified = false;

  if (rootName === "OKY") {
    const parsed = parseCompactDocument(document);
    name = parsed.name;
    address = parsed.address;
    countryCode = parsed.countryCode;
    sourceFieldCount = parsed.sourceFieldCount;
    verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64(parsed.signature),
      new TextEncoder().encode(parsed.signedPayload),
    );
  } else if (rootName === "OfflinePaperlessKyc") {
    const parsed = parseFullDocument(document);
    name = parsed.name;
    address = parsed.address;
    countryCode = parsed.countryCode;
    sourceFieldCount = parsed.sourceFieldCount;
    const signedXml = new SignedXml(document);
    signedXml.LoadXml(parsed.signature);
    verified = await signedXml.Verify(publicKey);
  } else {
    throw new Error("Only official UIDAI OKY or OfflinePaperlessKyc XML is supported.");
  }

  if (!verified) {
    throw new Error("UIDAI signature verification failed. The document may be altered or use an unsupported certificate.");
  }

  return {
    source: "uidai-offline-ekyc",
    issuer: "Unique Identification Authority of India",
    documentType: "Aadhaar Paperless Offline e-KYC",
    verifiedAt: new Date().toISOString(),
    validatedSourceFieldCount: sourceFieldCount,
    mappedProfileFields: [
      "first_name",
      "last_name",
      "country_of_residence",
      "document_issuance_country",
      "address",
    ],
    profile: userProfileSchema.parse({
      ...splitName(name),
      country_of_residence: countryCode,
      document_issuance_country: "IN",
      address,
      ssn: "",
    }),
  };
}
