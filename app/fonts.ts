import { Amiri, Inter, Noto_Naskh_Arabic } from "next/font/google";
import localFont from "next/font/local";

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

// KFGQPC Uthmanic Hafs — the official King Fahd Complex mushaf font, used by
// quran.com / recitequran.com / quran.foundation for authentic mushaf-quality
// Quranic text rendering. Self-hosted from public/fonts/ (privacy rule — no
// third-party font CDN). This is the ONLY font that pairs correctly with the
// text_uthmani encoding used in our verse JSON (private-use codepoints for
// Uthmani-specific ligatures + generous harakat spacing).
//
// Source: https://quran.com/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2
// Original: King Fahd Complex for the Printing of the Holy Quran — freely
// distributed for non-commercial Quranic typography.
export const amiriQuran = localFont({
  src: "../public/fonts/KFGQPC_Uthmanic_Hafs.woff2",
  variable: "--font-amiri-quran",
  display: "swap",
  preload: false,
  weight: "400",
  style: "normal",
});

export const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  preload: false,
});
