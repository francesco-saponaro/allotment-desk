import type { NextConfig } from "next";

// The desk ships as static files: every route is rendered to HTML at build time and the data
// layer under data/ runs in the browser. `trailingSlash` makes /bookings resolve to
// /bookings/index.html on any static host.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
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
