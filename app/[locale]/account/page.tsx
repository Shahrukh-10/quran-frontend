import { AccountPanel } from "@/components/account/account-panel";
import { AutoSyncInstaller } from "@/components/account/auto-sync-installer";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
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
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-md px-4 sm:px-6 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("pageTitle"), url: siteUrl("/account") },
        ]}
      />
      <AutoSyncInstaller />

      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {t("pageTitle")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-prose mx-auto leading-relaxed">
          {t("pageDescription")}
        </p>
      </header>

      <div className="mt-8">
        <AccountPanel />
      </div>

      <footer className="mt-10 rounded-2xl border border-separator bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {t("faqTitle")}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="font-medium">{t("faqDataQ")}</dt>
            <dd className="text-muted-foreground mt-1">{t("faqDataA")}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("faqEmailQ")}</dt>
            <dd className="text-muted-foreground mt-1">{t("faqEmailA")}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("faqDeleteQ")}</dt>
            <dd className="text-muted-foreground mt-1">{t("faqDeleteA")}</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}
