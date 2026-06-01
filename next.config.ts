import type { NextConfig } from "next";

/**
 * Static export: do not use assetPrefix './' — it breaks nested routes (_next lives at out/_next).
 * Post-build `npm run relativize-export` rewrites HTML to depth-relative paths.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
