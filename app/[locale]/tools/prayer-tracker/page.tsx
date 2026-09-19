import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { PrayerTracker } from "@/components/tools/prayer-tracker";
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
  const t = await getTranslations({ locale, namespace: "tools.prayerTracker" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? "/tools/prayer-tracker" : `/${locale}/tools/prayer-tracker`,
      ),
    },
  };
}

export default async function PrayerTrackerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tools.prayerTracker" });

  return (
    <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Tools", url: siteUrl("/tools") },
          { name: t("title"), url: siteUrl("/tools/prayer-tracker") },
        ]}
      />
      <header>
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-display leading-[1.1]">
          {t("title")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{t("description")}</p>
      </header>
      <div className="mt-8">
        <PrayerTracker />
      </div>
    </div>
  );
}
