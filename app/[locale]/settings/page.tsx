import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "settings" });
  return {
    title: t("title"),
    description: "Manage appearance, language, accessibility, and your on-device data.",
    alternates: { canonical: siteUrl(locale === "en" ? "/settings" : `/${locale}/settings`),
      languages: hreflangLanguages('/settings'), },
    openGraph: {
      url: siteUrl(locale === "en" ? "/settings" : `/${locale}/settings`),
    },
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "settings" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/settings") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Preferences</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">
            Manage appearance, language, accessibility, and your on-device data. Everything stays in
            your browser — nothing is sent anywhere.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          <div className="hig-card" style={{ padding: 0 }}>
            <SettingsPanel />
          </div>
        </div>
      </section>
    </>
  );
}
