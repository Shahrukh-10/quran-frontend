// /quran/hizb/[hizb] — read a single hizb (1..60). Half a juz.

import { AyahList } from "@/components/quran/ayah-list";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { ayatInHizb, summarizeHizb } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const params: Array<{ locale: string; hizb: string }> = [];
  for (const locale of locales) {
    for (let h = 1; h <= 60; h++) params.push({ locale, hizb: String(h) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; hizb: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, hizb } = await params;
  const bc = await breadcrumbs(locale);
  const n = Number.parseInt(hizb, 10);
  if (!Number.isInteger(n) || n < 1 || n > 60) return {};
  return {
    title: `Hizb ${n} · Reading`,
    description: `Read Hizb ${n} of the Quran — half of Juz ${Math.ceil(n / 2)}.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/hizb/${n}` : `/${locale}/quran/hizb/${n}`),
      languages: hreflangLanguages(`/quran/hizb/${n}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/quran/hizb/${n}` : `/${locale}/quran/hizb/${n}`),
    },
  };
}

export default async function HizbPage({ params }: Props) {
  const { locale, hizb } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const n = Number.parseInt(hizb, 10);
  if (!Number.isInteger(n) || n < 1 || n > 60) notFound();

  const keys = await ayatInHizb(n);
  const summaries = await summarizeHizb();
  const summary = summaries.find((s) => s.hizb === n);
  const prev = n > 1 ? n - 1 : null;
  const next = n < 60 ? n + 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: `Hizb ${n}`, url: siteUrl(`/quran/hizb/${n}`) },
        ]}
      />
      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Hizb</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">Hizb {n}</h1>
        {summary && (
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.firstKey} → {summary.lastKey} · {summary.ayahCount} ayat · Juz {summary.juz}
          </p>
        )}
      </header>

      <AyahList keys={keys} emptyLabel="This hizb has no ayat." />

      <nav
        aria-label="Hizb navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/hizb/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Previous</span>
              <span className="mt-1 block font-semibold tracking-title">Hizb {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/hizb/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Next</span>
              <span className="mt-1 block font-semibold tracking-title">Hizb {next}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
