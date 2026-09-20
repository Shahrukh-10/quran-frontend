import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllNames } from "@/lib/names";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_names-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "The 99 Names of Allah — Al-Asmāʾ al-Ḥusnā",
    description:
      'The 99 beautiful names of Allah, each with Arabic, transliteration, and translation. "To Allah belong the most beautiful names, so call upon Him by them." (Qur\'ān 7:180)',
    alternates: {
      canonical: siteUrl(locale === "en" ? "/names-of-allah" : `/${locale}/names-of-allah`),
      languages: hreflangLanguages("/names-of-allah"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/names-of-allah" : `/${locale}/names-of-allah`),
      type: "article",
      locale,
      images: mergedOgImages("The 99 Names of Allah — Al-Asmāʾ al-Ḥusnā"),
    },
  };
}

export default async function NamesIndexPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const names = getAllNames();
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 96 }}>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "99 Names", url: siteUrl("/names-of-allah") },
        ]}
      />

      <header>
        <p className="kicker">Al-Asmāʾ al-Ḥusnā</p>
        <h1 className="page-title">The 99 Names of Allāh.</h1>
        <p className="page-lede">
          &ldquo;To Allāh belong the most beautiful names, so call upon Him by them.&rdquo;
          (Qur&apos;ān 7:180)
        </p>
      </header>

      {/* Question-shaped H2 for AEO — the outline reads H1 (topic) → H2
          (question) → grid of 99 names. AI answer engines quote the two
          paragraphs directly below `<h2>` when the query is phrased as a
          question ("What are the 99 Names of Allah?"). */}
      <section aria-labelledby="what-are-99-names" style={{ marginTop: "32px" }}>
        <h2 id="what-are-99-names" className="page-subtitle">
          What are the 99 Names of Allah?
        </h2>
        <p className="page-lede" style={{ marginTop: "12px" }}>
          The 99 Names of Allah — al-Asmāʾ al-Ḥusnā (الأسماء الحسنى, &ldquo;the
          most beautiful names&rdquo;) — are the attributes by which Allah has
          named Himself in the Qur&apos;an and in the authentic hadith of the
          Prophet Muḥammad ﷺ. Each name describes a facet of the divine — such
          as ar-Raḥmān (the Entirely Merciful), al-Ḥakīm (the All-Wise), or
          al-Ghafūr (the Most-Forgiving) — and Muslims are taught to invoke
          Allah by them. The Prophet ﷺ said: &ldquo;Allah has ninety-nine
          names; whoever memorizes them will enter Paradise&rdquo; (Ṣaḥīḥ
          al-Bukhārī 2736, Muslim 2677).
        </p>
      </section>

      <div className="names-grid">
        {names.map((n) => (
          <Link key={n.slug} href={`/names-of-allah/${n.slug}`} className="focus-ring name-card">
            <span className="name-number">{n.order}</span>
            <div className="name-ar" lang="ar" dir="rtl">
              {n.arabic}
            </div>
            <div className="name-translit">{n.transliteration}</div>
            <div className="name-en">{n.meaning[lang]}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
