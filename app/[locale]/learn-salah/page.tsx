import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSalahTutorials } from "@/lib/salah";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "./_salah-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/learn-salah" : `/${locale}/learn-salah`),
    },
  };
}

export default async function LearnSalahIndex({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "learnSalah.index" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const tutorials = getAllSalahTutorials();

  return (
    <main className="mx-auto max-w-dashboard px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Learn Salah", url: siteUrl("/learn-salah") },
        ]}
      />

      <p className="kicker">{t("eyebrow")}</p>
      <h1 className="page-title">{t("title")}</h1>
      <p className="page-lede">{t("description")}</p>

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
