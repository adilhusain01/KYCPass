import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@terminal3/t3n-sdk"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
