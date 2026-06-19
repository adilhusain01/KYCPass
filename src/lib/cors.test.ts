import { describe, expect, it } from "vitest";

import { corsHeaders } from "@/lib/cors";

describe("public integration CORS", () => {
  it("allows credentials for a browser partner origin", () => {
    const headers = corsHeaders(
      new Request("https://kycpass.example/api/t3/status", {
        headers: { Origin: "https://bank.example" },
      }),
    );

    expect(headers["Access-Control-Allow-Origin"]).toBe("https://bank.example");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
  });

  it("does not combine wildcard CORS with credentials", () => {
    const headers = corsHeaders(new Request("https://kycpass.example/api/config"));

    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
  });
});
