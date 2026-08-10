import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: process.env.FASTAPI_ORIGIN
        ? `${process.env.FASTAPI_ORIGIN}/api/:path*`
        : "/api/",
    }];
  },
};

export default nextConfig;
