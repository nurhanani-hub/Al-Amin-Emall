import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles build output automatically
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
