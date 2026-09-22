// /quran/juz/[juz] — read a single juz (1..30). Static params for all 30 juz
// × 2 locales are prebuilt.

import { AyahList } from "@/components/quran/ayah-list";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { ayatInJuz, summarizeJuz } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const params: Array<{ locale: string; juz: string }> = [];
  for (const locale of locales) {
    for (let j = 1; j <= 30; j++) params.push({ locale, juz: String(j) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; juz: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, juz } = await params;
  const bc = await breadcrumbs(locale);
  const n = Number.parseInt(juz, 10);
  if (!Number.isInteger(n) || n < 1 || n > 30) return {};
  return {
    title: `Juz ${n} · Reading`,
    description: `Read Juz ${n} of the Quran with Arabic, translation, transliteration, and verse audio.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/juz/${n}` : `/${locale}/quran/juz/${n}`),
      languages: hreflangLanguages(`/quran/juz/${n}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/quran/juz/${n}` : `/${locale}/quran/juz/${n}`),
    },
  };
}

export default async function JuzPage({ params }: Props) {
  const { locale, juz } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const n = Number.parseInt(juz, 10);
  if (!Number.isInteger(n) || n < 1 || n > 30) notFound();

  const keys = await ayatInJuz(n);
  const summaries = await summarizeJuz();
  const summary = summaries.find((s) => s.juz === n);
  const prev = n > 1 ? n - 1 : null;
  const next = n < 30 ? n + 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: `Juz ${n}`, url: siteUrl(`/quran/juz/${n}`) },
        ]}
      />
      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Juz</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">Juz {n}</h1>
        {summary && (
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.firstKey} → {summary.lastKey} · {summary.ayahCount} ayat ·{" "}
            {summary.surahs.length} surah{summary.surahs.length === 1 ? "" : "s"}
          </p>
        )}
      </header>

      <AyahList keys={keys} emptyLabel="This juz has no ayat." />

      <nav
        aria-label="Juz navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/juz/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Previous</span>
              <span className="mt-1 block font-semibold tracking-title">Juz {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/juz/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Next</span>
              <span className="mt-1 block font-semibold tracking-title">Juz {next}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
