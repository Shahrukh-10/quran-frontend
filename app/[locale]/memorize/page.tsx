import { MemorizeDashboard } from "@/components/memorize/dashboard";
import { JuzPicker } from "@/components/memorize/juz-picker";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "memorize.index" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/memorize" : `/${locale}/memorize`),
      languages: hreflangLanguages('/memorize'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/memorize" : `/${locale}/memorize`),
    },
  };
}

export default async function MemorizeIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "memorize.index" });
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/memorize") },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">{t("eyebrow")}</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          {t("title")}
        </h1>
        <p className="mt-4 mx-auto max-w-prose text-muted-foreground leading-relaxed">
          {t("description")}
        </p>
      </header>

      <MemorizeDashboard />
      <JuzPicker />

      <p className="mt-16 text-center text-xs text-muted-foreground max-w-prose mx-auto">
        {t("privacyNotice")}
      </p>
    </article>
  );
}
