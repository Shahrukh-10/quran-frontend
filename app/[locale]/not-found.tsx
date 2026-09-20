import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

// Locale-aware 404. Rendered inside the [locale] segment so the site
// header, footer, theme, background, and translations all apply.
// Falls through to app/not-found.tsx only for paths that never enter
// the [locale] tree (e.g. a raw /_thing hit).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notFound" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

  return (
    <main
      id="main"
      className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground tracking-widest">{t("code")}</p>
      <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-title">
        {t("title")}
      </h1>
      <p className="mt-4 mx-auto max-w-prose text-muted-foreground">{t("description")}</p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium transition-colors duration-micro ease-spring hover:opacity-90"
        >
          {t("returnHome")}
        </Link>
        <Link
          href="/quran"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator bg-surface font-medium transition-colors duration-micro ease-spring hover:bg-muted"
        >
          {t("browseQuran")}
        </Link>
        <Link
          href="/prayer-times"
          className="focus-ring inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator bg-surface font-medium transition-colors duration-micro ease-spring hover:bg-muted"
        >
          {t("seePrayerTimes")}
        </Link>
      </div>

      <nav aria-label={t("helpfulLinks")} className="mt-12">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("helpfulLinks")}
        </p>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/duas" className="hover:underline underline-offset-4">
              {tNav("duas")}
            </Link>
          </li>
          <li>
            <Link href="/qibla" className="hover:underline underline-offset-4">
              {tNav("qibla")}
            </Link>
          </li>
          <li>
            <Link href="/names-of-allah" className="hover:underline underline-offset-4">
              {tNav("names")}
            </Link>
          </li>
          <li>
            <Link href="/learn-salah" className="hover:underline underline-offset-4">
              {tNav("learnSalah")}
            </Link>
          </li>
          <li>
            <Link href="/mushaf" className="hover:underline underline-offset-4">
              {tNav("mushaf")}
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
