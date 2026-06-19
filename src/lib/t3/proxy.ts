import { NODE_URLS } from "@terminal3/t3n-sdk";

const ALLOWED_REQUESTS = new Set([
  "GET status",
  "GET api/contracts/current",
  "POST api/rpc",
]);

export function getT3NodeOrigin(environment: string | undefined) {
  return environment === "production" ? NODE_URLS.production : NODE_URLS.testnet;
}

export function getAllowedT3Path(method: string, path: string[]) {
  const normalized = path.join("/");
  if (!ALLOWED_REQUESTS.has(`${method.toUpperCase()} ${normalized}`)) {
    throw new Error("Terminal 3 proxy path is not allowed.");
  }
  return normalized;
}

export function extractAffinityCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("GCLB="));
  return cookie ?? null;
}

export function rewriteAffinityCookie(setCookie: string | null, secure = false) {
  if (!setCookie) return null;
  const affinityCookie = setCookie
    .split(/,(?=\s*[^;,=\s]+=[^;,]+)/)
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("GCLB="));
  const pair = affinityCookie?.split(";", 1)[0];
  if (!pair) return null;

  const crossSiteAttributes = secure ? "; SameSite=None; Secure" : "; SameSite=Lax";
  return `${pair}; Path=/api/t3; HttpOnly${crossSiteAttributes}`;
}
