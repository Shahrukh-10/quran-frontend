import { locales } from "@/i18n/config";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "Offline",
  description: "You appear to be offline. Cached content is still available.",
};

export default async function OfflinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="section section--hero" style={{ paddingTop: 120, paddingBottom: 80 }}>
      <div className="container container--narrow" style={{ textAlign: "center" }}>
        <span className="eyebrow">You&apos;re offline</span>
        <h1 className="page-title" style={{ margin: "12px auto 12px" }}>
          Cached content is available
        </h1>
        <p className="page-lede" style={{ margin: "0 auto 24px" }}>
          The Quran, duas, tutorials, 99 Names, and the calendar work without a network. Prayer
          times use your device — they&apos;ll still compute if location is granted.
        </p>
      </div>
    </section>
  );
}
