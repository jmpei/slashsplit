import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The fixture receipt extractor (#9) reads these at runtime on previews; bundle them with the route.
  outputFileTracingIncludes: {
    "/api/v1/households/*/receipts/scan": ["./tests/fixtures/receipts/*.json"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
