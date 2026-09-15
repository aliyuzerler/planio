import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenior/ui",
    "@xenior/types",
    "@xenior/validation",
    "@xenior/config",
  ],
};

export default nextConfig;
