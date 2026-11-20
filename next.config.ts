import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // API routes read prompts/*.xml and data/**/* at runtime; make sure they ship to Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./prompts/**/*", "./data/**/*"],
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
