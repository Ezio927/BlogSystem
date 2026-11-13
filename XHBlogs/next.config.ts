import type { NextConfig } from 'next';
import { BASE_PATH } from './lib/sitePath.mjs';
const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: BASE_PATH,
  images: { unoptimized: true },
};
export default nextConfig;
