import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSalahTutorials } from "@/lib/salah";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_salah-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/learn-salah" : `/${locale}/learn-salah`),
      languages: hreflangLanguages("/learn-salah"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/learn-salah" : `/${locale}/learn-salah`),
      type: "article",
      locale,
      images: mergedOgImages(t("title")),
    },
  };
}

export default async function LearnSalahIndex({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const tutorials = getAllSalahTutorials();

  return (
    <main className="mx-auto max-w-dashboard px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("learnSalah"), url: siteUrl("/learn-salah") },
        ]}
      />

      <p className="kicker">{t("eyebrow")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-lede">{t("description")}</p>

      {/* Question-shaped H2 for AEO — Google AI Overviews and Perplexity
          look for `<h2>`s that phrase the search intent as a question and
          answer it directly beneath. Placed above the fold, before the
          picker, so the crawlable outline reads: H1 (topic) → H2 (question)
          → tutorials. */}
      <section aria-labelledby="what-is-salah" style={{ marginTop: "32px" }}>
        <h2 id="what-is-salah" className="page-subtitle">
          What is Salah?
        </h2>
        <p className="page-lede" style={{ marginTop: "12px" }}>
          Salah (Arabic: صَلَاة) is the ritual prayer performed five times daily
          by every Muslim beyond puberty — at dawn (Fajr), midday (Zuhr),
          afternoon (Asr), sunset (Maghrib), and night (Isha). Each prayer is
          a fixed sequence of standing, bowing (rukūʿ), and prostrating
          (sujūd), recited in Arabic while facing the Qiblah — the direction
          of the Kaʿbah in Makkah. It is the second pillar of Islam after the
          shahada and the first act every Muslim is accountable for on the
          Day of Judgement.
        </p>
      </section>

      <div className="prayer-picker" role="tablist" style={{ marginTop: "24px" }}>
        {tutorials.map((tut, i) => (
          <Link key={tut.slug} href={`/learn-salah/${tut.slug}`} role="tab" aria-selected={i === 0}>
            {tut.title[lang]}
          </Link>
        ))}
      </div>

      <div className="timeline">
        {tutorials.map((tut, i) => (
          <div key={tut.slug} className="step">
            <span className="step-num">Tutorial {i + 1}</span>
            <h3>{tut.title[lang]}</h3>
            <p className="subtitle">
              {tut.category}
              {tut.rakats ? ` · ${tut.rakats} rakats` : ""}
            </p>
            <div className="body">
              <p>{tut.summary[lang]}</p>
            </div>
            <p className="source" style={{ marginTop: 12 }}>
              <Link
                href={`/learn-salah/${tut.slug}`}
                className="focus-ring"
                style={{
                  color: "hsl(var(--accent))",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                Open the full tutorial →
              </Link>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
