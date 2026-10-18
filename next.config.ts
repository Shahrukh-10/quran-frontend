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
    {
      source: `/quran/word-by-word/${number}`,
      destination: `/quran/word-by-word/${slug}`,
      permanent: true,
    },
    {
      source: `/:locale(id|ar|ur|tr|fr)/quran/${number}`,
      destination: `/:locale/quran/${slug}`,
      permanent: true,
    },
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

// Short-slug aliases for Learn Salah tutorials.
//
// Why these exist: GSC data (2026-10-12 export) shows users type the short
// form (`fajr`, `witr prayer`, `jumuah`), while our tutorial pages live under
// the descriptive form (`/learn-salah/how-to-pray-fajr`). The slug-vs-query
// gap drags these pages to position 50-87 on a new domain. 308 permanent
// redirects from the short form to the canonical descriptive URL make the
// short form a usable entry point without duplicating content.
//
// Canonical remains the descriptive form (set in app/[locale]/learn-salah/[topic]/page.tsx).
// The redirect is `permanent: true` so Google folds the alias into the
// canonical page's authority within one crawl cycle.
const SALAH_ALIASES: Array<[string, string]> = [
  ["fajr", "how-to-pray-fajr"],
  ["dhuhr", "how-to-pray-dhuhr-asr-isha"],
  ["asr", "how-to-pray-dhuhr-asr-isha"],
  ["isha", "how-to-pray-dhuhr-asr-isha"],
  ["maghrib", "how-to-pray-maghrib"],
  ["witr", "how-to-pray-witr"],
  ["jumuah", "how-to-pray-jumuah"],
  ["jumah", "how-to-pray-jumuah"],
  ["juma", "how-to-pray-jumuah"],
  ["friday-prayer", "how-to-pray-jumuah"],
  ["janazah", "how-to-pray-janazah"],
  ["funeral-prayer", "how-to-pray-janazah"],
  ["ablution", "wudu"],
  ["how-to-salah", "how-to-pray"],
  ["how-to-perform-salah", "how-to-pray"],
  ["how-to-pray-namaz", "how-to-pray"],
];
const LEARN_SALAH_REDIRECTS = SALAH_ALIASES.flatMap(([alias, canonical]) => [
  { source: `/learn-salah/${alias}`, destination: `/learn-salah/${canonical}`, permanent: true },
  {
    source: `/:locale(id|ar|ur|tr|fr)/learn-salah/${alias}`,
    destination: `/:locale/learn-salah/${canonical}`,
    permanent: true,
  },
]);

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
  // Skip Next.js internal ESLint+tsc during `next build` to prevent OOM on the
  // 8 GB KVM2 VPS. We already run `pnpm typecheck` + `pnpm biome check` locally
  // pre-commit, and the GHA pre-deploy checks (see CLAUDE.md) run them again
  // before push. This disables ONLY the redundant check that `next build`
  // runs AFTER compilation while static-prerendering 50k+ pages — that
  // concurrency is what OOM-killed GHA run 38848729963 on 2026-10-16.
  // Pattern: toolspace-seo-invariants §6 (same KVM2 host, 4 GB heap cap proven
  // insufficient against combined tsc + static-param-scan RSS).
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Enable once every linked route exists. Right now we link to /quran, /duas, /prayer-times,
    // /qibla, /learn-salah as placeholders on the homepage — those pages ship in Weeks 3–5.
    // typedRoutes: true,
  },
  async redirects() {
    return [...NUMERIC_SURAH_REDIRECTS, ...LEARN_SALAH_REDIRECTS];
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
