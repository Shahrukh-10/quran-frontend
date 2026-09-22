import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { TasbihCounter } from "@/components/tools/tasbih-counter";
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
  const t = await getTranslations({ locale, namespace: "tools.tasbih" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/tools/tasbih" : `/${locale}/tools/tasbih`),
      languages: hreflangLanguages('/tools/tasbih'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/tools/tasbih" : `/${locale}/tools/tasbih`),
    },
  };
}

export default async function TasbihPage({ params }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tools.tasbih" });

  return (
    <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("tools"), url: siteUrl("/tools") },
          { name: t("title"), url: siteUrl("/tools/tasbih") },
        ]}
      />
      <header>
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-display leading-[1.1]">
          {t("title")}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">{t("description")}</p>
      </header>
      <div className="mt-8">
        <TasbihCounter />
      </div>
    </div>
  );
}
