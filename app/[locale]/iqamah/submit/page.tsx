import { SubmitForm } from "@/components/iqamah/submit-form";
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
  const t = await getTranslations({ locale, namespace: "iqamah.submit" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function SubmitPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "iqamah.submit" });
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("iqamah"), url: siteUrl("/iqamah") },
          { name: t("pageTitle"), url: siteUrl("/iqamah/submit") },
        ]}
      />

      <Link href="/iqamah" className="focus-ring text-sm text-accent hover:underline">
        {t("backToList")}
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-prose">{t("pageDescription")}</p>
        <p className="mt-2 text-xs text-muted-foreground max-w-prose italic">
          {t("moderationNotice")}
        </p>
      </header>

      <div className="mt-8">
        <SubmitForm />
      </div>
    </article>
  );
}
