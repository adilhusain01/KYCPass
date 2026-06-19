import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.KYCPASS_NEXT_DIST_DIR ?? ".next",
  outputFileTracingIncludes: {
    "/api/agent/overview": [
      "./node_modules/.pnpm/@bytecodealliance+preview2-shim@*/node_modules/@bytecodealliance/preview2-shim/lib/io/**/*",
      "./node_modules/.pnpm/@bytecodealliance+preview2-shim@*/node_modules/@bytecodealliance/preview2-shim/lib/synckit/**/*",
    ],
    "/api/disclosures/execute": [
      "./node_modules/.pnpm/@bytecodealliance+preview2-shim@*/node_modules/@bytecodealliance/preview2-shim/lib/io/**/*",
      "./node_modules/.pnpm/@bytecodealliance+preview2-shim@*/node_modules/@bytecodealliance/preview2-shim/lib/synckit/**/*",
    ],
  },
  serverExternalPackages: ["@terminal3/t3n-sdk"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
