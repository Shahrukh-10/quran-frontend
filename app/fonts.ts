import { Amiri, Amiri_Quran, Inter, Noto_Naskh_Arabic } from "next/font/google";

// Self-hosted via next/font — no third-party font CDN (privacy rule, docs/ARCHITECTURE.md §Privacy).
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Perf: `preload: false` on Arabic fonts.
// Rationale: mobile Lighthouse (2026-09) showed 5 preloaded font files totalling
// ~405 KB fighting for bandwidth during the LCP window (LCP 6.3 s → target < 2.5 s).
// The primary text on every page is Latin (Inter). Arabic renders on the reader
// pages and on the calligraphy watermark — both non-LCP surfaces on the home hero.
// With `display: swap`, next/font will still download these on first use and swap
// the glyphs in with zero layout shift, but the browser no longer holds up the
// initial paint waiting for them.
export const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
  preload: false,
});

export const amiriQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: ["400"],
  variable: "--font-amiri-quran",
  display: "swap",
  preload: false,
});

export const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  preload: false,
});
