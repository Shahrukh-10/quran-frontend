import { CalendarView } from "@/components/calendar/calendar-view";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const t = await getTranslations({ locale, namespace: "calendar" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: siteUrl(locale === "en" ? "/calendar" : `/${locale}/calendar`) },
    openGraph: {
      url: siteUrl(locale === "en" ? "/calendar" : `/${locale}/calendar`),
    },
  };
}

export default async function CalendarPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "calendar" });

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "Islamic calendar", url: siteUrl("/calendar") },
        ]}
      />
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lede">{t("description")}</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="hig-card">
            <CalendarView locale={locale as "en" | "id"} />
          </div>
        </div>
      </section>
    </>
  );
}
