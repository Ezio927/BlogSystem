import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@open-blog/content-core", "@open-blog/shared-types"],
};

export default nextConfig;
