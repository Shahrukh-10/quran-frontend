import { Amiri, Amiri_Quran, Inter, Noto_Naskh_Arabic } from "next/font/google";

// Self-hosted via next/font — no third-party font CDN (privacy rule, docs/ARCHITECTURE.md §Privacy).
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const amiriQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: ["400"],
  variable: "--font-amiri-quran",
  display: "swap",
});

export const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
});
