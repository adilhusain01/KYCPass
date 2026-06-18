import { describe, expect, it } from "vitest";

import { buildDisclosureGrant } from "@/lib/t3/grants";

const did = "did:t3n:1111111111111111111111111111111111111111";

describe("disclosure grant construction", () => {
  it("binds one agent, contract function, version, and verifier host", () => {
    expect(
      buildDisclosureGrant({
        agentDid: did,
        tenantDid: did,
        contractTail: "kyc-disclosure",
        contractVersion: "0.1.0",
        verifierHost: "kycpass.example",
      }),
    ).toEqual({
      agents: [
        {
          agentDid: did,
          scripts: [
            {
              scriptName: "z:1111111111111111111111111111111111111111:kyc-disclosure",
              versionReq: "0.1.0",
              functions: ["submit-kyc-proof"],
              allowedHosts: ["kycpass.example"],
            },
          ],
        },
      ],
    });
  });

  it("rejects a host containing a path", () => {
    expect(() =>
      buildDisclosureGrant({
        agentDid: did,
        tenantDid: did,
        contractTail: "kyc-disclosure",
        contractVersion: "0.1.0",
        verifierHost: "kycpass.example/api",
      }),
    ).toThrow("path");
  });
});
