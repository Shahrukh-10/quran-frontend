import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
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
  const t = await getTranslations({ locale, namespace: "install.page" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: siteUrl(locale === "en" ? "/install" : `/${locale}/install`),
      languages: hreflangLanguages('/install'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/install" : `/${locale}/install`),
    },
  };
}

export default async function InstallPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "install.page" });
  const bc = await breadcrumbs(locale);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("title"), url: siteUrl("/install") },
        ]}
      />

      <header className="text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">{t("title")}</h1>
        <p className="mt-4 mx-auto max-w-prose text-muted-foreground leading-relaxed">{t("description")}</p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          { icon: "◈", key: "featureOffline" },
          { icon: "◉", key: "featureHome" },
          { icon: "◆", key: "featureFast" },
        ].map(({ icon, key }) => (
          <div key={key} className="rounded-2xl border border-separator bg-surface p-5">
            <div aria-hidden className="text-3xl mb-2 text-accent">
              {icon}
            </div>
            <p className="font-semibold tracking-title">{t(`${key}Title`)}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {t(`${key}Body`)}
            </p>
          </div>
        ))}
      </section>

      <section aria-labelledby="ios-heading" className="mt-10 rounded-2xl border border-separator bg-surface p-6">
        <h2 id="ios-heading" className="text-lg font-semibold tracking-title">
          📱 {t("iosHeading")}
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span> {t("iosStep1")}
          </li>
          <li>
            <span className="font-medium">2.</span> {t("iosStep2")}
          </li>
          <li>
            <span className="font-medium">3.</span> {t("iosStep3")}
          </li>
          <li>
            <span className="font-medium">4.</span> {t("iosStep4")}
          </li>
        </ol>
      </section>

      <section aria-labelledby="android-heading" className="mt-6 rounded-2xl border border-separator bg-surface p-6">
        <h2 id="android-heading" className="text-lg font-semibold tracking-title">
          🤖 {t("androidHeading")}
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span> {t("androidStep1")}
          </li>
          <li>
            <span className="font-medium">2.</span> {t("androidStep2")}
          </li>
          <li>
            <span className="font-medium">3.</span> {t("androidStep3")}
          </li>
        </ol>
      </section>

      <section aria-labelledby="desktop-heading" className="mt-6 rounded-2xl border border-separator bg-surface p-6">
        <h2 id="desktop-heading" className="text-lg font-semibold tracking-title">
          💻 {t("desktopHeading")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t("desktopBody")}</p>
      </section>

      <section aria-labelledby="native-heading" className="mt-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-6">
        <h2 id="native-heading" className="text-lg font-semibold tracking-title">
          {t("nativeQuestion")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t("nativeAnswer")}</p>
      </section>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator hover:bg-muted"
        >
          {t("backHome")}
        </Link>
        <Link
          href="/quran"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium"
        >
          {t("openQuran")}
        </Link>
      </div>
    </article>
  );
}
