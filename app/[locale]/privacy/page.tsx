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
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("title"),
    description: t("intro"),
    alternates: { canonical: siteUrl(locale === "en" ? "/privacy" : `/${locale}/privacy`) },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "privacy" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/privacy") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Your data</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("intro")}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow" style={{ display: "grid", gap: 16 }}>
          <div className="hig-card">
            <h2 className="hig-card__title" style={{ fontSize: 18 }}>
              {t("storageTitle")}
            </h2>
            <p className="hig-card__body" style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55 }}>
              {t("storageBody")}
            </p>
          </div>
          <div className="hig-card">
            <h2 className="hig-card__title" style={{ fontSize: 18 }}>
              {t("cookiesTitle")}
            </h2>
            <p className="hig-card__body" style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55 }}>
              {t("cookiesBody")}
            </p>
          </div>
          <div className="hig-card">
            <h2 className="hig-card__title" style={{ fontSize: 18 }}>
              {t("rightsTitle")}
            </h2>
            <p className="hig-card__body" style={{ marginTop: 6, fontSize: 15, lineHeight: 1.55 }}>
              {t("rightsBody")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
