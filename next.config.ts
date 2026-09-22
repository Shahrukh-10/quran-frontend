import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import surahsMeta from "./data/quran/surahs.json";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Build once at config-eval time: numeric surah id → slug.
// This lets us send permanent redirects for /quran/1 → /quran/al-fatihah,
// /quran/2:255 style deep links, and locale-prefixed variants, so external links
// (Google, other Quran sites, shared URLs) resolve instead of 404-ing.
const NUMERIC_SURAH_REDIRECTS = (surahsMeta as Array<{ number: number; slug: string }>).flatMap(
  ({ number, slug }) => [
    { source: `/quran/${number}`, destination: `/quran/${slug}`, permanent: true },
    { source: `/quran/${number}/:ayah`, destination: `/quran/${slug}/:ayah`, permanent: true },
    { source: `/quran/word-by-word/${number}`, destination: `/quran/word-by-word/${slug}`, permanent: true },
    { source: `/:locale(id|ar|ur|tr|fr)/quran/${number}`, destination: `/:locale/quran/${slug}`, permanent: true },
    {
      source: `/:locale(id|ar|ur|tr|fr)/quran/${number}/:ayah`,
      destination: `/:locale/quran/${slug}/:ayah`,
      permanent: true,
    },
    {
      source: `/:locale(id|ar|ur|tr|fr)/quran/word-by-word/${number}`,
      destination: `/:locale/quran/word-by-word/${slug}`,
      permanent: true,
    },
  ],
);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Optional build-dir override — used by the CI deploy workflow to
  // stage a fresh build in `.next.new` (leaving the live `.next` untouched)
  // and atomically swap on success. Falls back to `.next` when unset.
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
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
  async redirects() {
    return NUMERIC_SURAH_REDIRECTS;
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
