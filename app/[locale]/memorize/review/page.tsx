import { ReviewSession } from "@/components/memorize/review-session";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "memorize.review" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    // No-index — this is a private per-user session.
    robots: { index: false, follow: false },
  };
}

export default async function MemorizeReviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "memorize.review" });
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("memorize"), url: siteUrl("/memorize") },
          { name: t("pageTitle"), url: siteUrl("/memorize/review") },
        ]}
      />

      <Link href="/memorize" className="focus-ring text-sm text-accent hover:underline">
        {t("backToDashboard")}
      </Link>

      <header className="mt-4 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-prose mx-auto">
          {t("pageDescription")}
        </p>
      </header>

      <ReviewSession />
    </article>
  );
}
