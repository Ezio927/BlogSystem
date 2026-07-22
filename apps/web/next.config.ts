import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@open-blog/content-core",
    "@open-blog/markdown-renderer",
    "@open-blog/shared-types",
    "@open-blog/ui",
  ],
};

export default nextConfig;
