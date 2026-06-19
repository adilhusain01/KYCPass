const DEFAULT_ALLOWED_METHODS = "GET,POST,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type,Session-Id";

export function corsHeaders(request: Request, methods = DEFAULT_ALLOWED_METHODS) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin) headers["Access-Control-Allow-Credentials"] = "true";
  return headers;
}

export function withCors(request: Request, headers?: HeadersInit) {
  return {
    ...corsHeaders(request),
    ...Object.fromEntries(new Headers(headers)),
  };
}
