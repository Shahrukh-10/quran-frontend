import { AdhanPlayer } from "@/components/adhan/adhan-player";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "adhan" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl(locale === "en" ? "/adhan" : `/${locale}/adhan`) },
  };
}

export default async function AdhanPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adhan" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/adhan") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Call to prayer</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("description")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <div className="hig-card">
            <AdhanPlayer />
          </div>
        </div>
      </section>
    </>
  );
}
