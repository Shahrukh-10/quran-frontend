import type { ReactNode } from "react";
import type { Metadata } from "next";
import { siteName, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl("/")),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description:
    "Free, sourced, offline-first Quran, hadith, duas, prayer times, Qibla, and Salah tutorials.",
  applicationName: siteName,
  alternates: {
    canonical: siteUrl("/"),
  },
  openGraph: {
    type: "website",
    siteName,
    url: siteUrl("/"),
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

// Root layout runs for every request. All real UI lives under app/[locale]/layout.tsx.
// This layout stays minimal so the locale-aware layout can own <html> and <body>.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
