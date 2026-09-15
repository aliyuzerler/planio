import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenior/ui",
    "@xenior/types",
    "@xenior/validation",
    "@xenior/config",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
