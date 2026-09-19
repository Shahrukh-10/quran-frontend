import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root to THIS project. There's a stray
  // ~/Documents/personalProject/package-lock.json from another workspace
  // and without this pin Next 15 picks that outer lockfile as the root,
  // resolves modules against a non-existent outer node_modules, and
  // production `next build` fails during prerender with a webpack-runtime
  // "TypeError: a[d] is not a function" on unrelated pages. Dev is
  // unaffected because dev mode resolves per-request.
  outputFileTracingRoot: path.join(__dirname),
  // Static export not enabled — Cloudflare Pages runs the Next.js runtime via @cloudflare/next-on-pages.
  // We keep SSG as the primary strategy per docs/ARCHITECTURE.md; runtime is only for client components.
  images: {
    // next/image with the default loader works on Cloudflare Pages.
    // Domains kept empty — all imagery is local or data URLs (see docs/DESIGN.md).
    remotePatterns: [],
  },
  experimental: {
    // Enable once every linked route exists. Right now we link to /quran, /duas, /prayer-times,
    // /qibla, /learn-salah as placeholders on the homepage — those pages ship in Weeks 3–5.
    // typedRoutes: true,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";
    return [
      // /api/ayah/* stays local (Next.js route handler)
      // /api/qb/* proxies to Spring Boot backend
      { source: "/api/qb/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
