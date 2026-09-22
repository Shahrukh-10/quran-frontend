import { MushafReader } from "@/components/quran/mushaf-reader";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { getAllMushafPages } from "@/lib/mushaf";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Read the Muṣḥaf — page-fold Qur'ān",
    description:
      "Read the full Qur'ān as a bound book. The 604-page Madinah muṣḥaf layout with a real page-fold animation, offline-first, resumes where you left off.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/mushaf" : `/${locale}/mushaf`),
      languages: hreflangLanguages('/mushaf'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/mushaf" : `/${locale}/mushaf`),
    },
  };
}

export default async function MushafPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  // Full 604-page Madinah muṣḥaf, built once at server-start / build time.
  const pages = getAllMushafPages();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: "Muṣḥaf reader", url: siteUrl("/mushaf") },
        ]}
      />
      <section className="section section--hero" style={{ paddingTop: 32, paddingBottom: 12 }}>
        <div className="container container--narrow">
          <span className="eyebrow">Muṣḥaf · Page-fold reader</span>
          <h1 className="page-title" style={{ margin: "6px 0 8px" }}>
            Read the Qur&apos;ān as a book.
          </h1>
          <p className="page-lede" style={{ margin: 0, fontSize: 15 }}>
            All {pages.length} pages of the Madinah muṣḥaf, with a real page-fold animation. Swipe,
            click the corners, or use ← / → to turn. Your place is saved on this device.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          <MushafReader pages={pages} />
        </div>
      </section>
    </>
  );
}
