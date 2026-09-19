// /quran/page/[page] — read a single Madinah-mushaf page (1..604).

import { AyahList } from "@/components/quran/ayah-list";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { ayatInPage, summarizePages } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

const TOTAL_PAGES = 604;

export async function generateStaticParams() {
  const params: Array<{ locale: string; page: string }> = [];
  for (const locale of locales) {
    for (let p = 1; p <= TOTAL_PAGES; p++) params.push({ locale, page: String(p) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await params;
  const n = Number.parseInt(page, 10);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PAGES) return {};
  return {
    title: `Page ${n} · Quran`,
    description: `Read page ${n} of the Madinah muṣḥaf, with Arabic, translation, and audio for every ayah on this page.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/page/${n}` : `/${locale}/quran/page/${n}`),
    },
  };
}

export default async function PagePage({ params }: Props) {
  const { locale, page } = await params;
  setRequestLocale(locale);
  const n = Number.parseInt(page, 10);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PAGES) notFound();

  const keys = await ayatInPage(n);
  const summaries = await summarizePages();
  const summary = summaries.find((s) => s.page === n);
  const prev = n > 1 ? n - 1 : null;
  const next = n < TOTAL_PAGES ? n + 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: siteUrl("/") },
          { name: "Quran", url: siteUrl("/quran") },
          { name: `Page ${n}`, url: siteUrl(`/quran/page/${n}`) },
        ]}
      />
      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Page</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          Page {n} of {TOTAL_PAGES}
        </h1>
        {summary && (
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.firstKey} → {summary.lastKey} · {summary.ayahCount} ayat on this page
          </p>
        )}
      </header>

      <AyahList keys={keys} emptyLabel="This page is blank in the mushaf." />

      <nav
        aria-label="Page navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/page/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Previous page</span>
              <span className="mt-1 block font-semibold tracking-title">Page {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/page/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Next page</span>
              <span className="mt-1 block font-semibold tracking-title">Page {next}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
