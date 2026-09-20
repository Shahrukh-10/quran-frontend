// /quran/manzil/[manzil] — read a single manzil (1..7). Manzils divide the
// Quran into 7 roughly-equal portions used for weekly-reading schedules.

import { AyahList } from "@/components/quran/ayah-list";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { ayatInManzil, summarizeManzil } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; manzil: string }> = [];
  for (const locale of locales) {
    for (let m = 1; m <= 7; m++) params.push({ locale, manzil: String(m) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; manzil: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, manzil } = await params;
  const bc = await breadcrumbs(locale);
  const n = Number.parseInt(manzil, 10);
  if (!Number.isInteger(n) || n < 1 || n > 7) return {};
  return {
    title: `Manzil ${n} · Reading`,
    description: `Read Manzil ${n} of the Quran. The manzils divide the Quran into 7 portions for weekly recitation.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/manzil/${n}` : `/${locale}/quran/manzil/${n}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/quran/manzil/${n}` : `/${locale}/quran/manzil/${n}`),
    },
  };
}

export default async function ManzilPage({ params }: Props) {
  const { locale, manzil } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const n = Number.parseInt(manzil, 10);
  if (!Number.isInteger(n) || n < 1 || n > 7) notFound();

  const keys = await ayatInManzil(n);
  const summaries = await summarizeManzil();
  const summary = summaries.find((s) => s.manzil === n);
  const prev = n > 1 ? n - 1 : null;
  const next = n < 7 ? n + 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: `Manzil ${n}`, url: siteUrl(`/quran/manzil/${n}`) },
        ]}
      />
      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Manzil</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">Manzil {n}</h1>
        {summary && (
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.firstKey} → {summary.lastKey} · {summary.ayahCount} ayat
          </p>
        )}
      </header>

      <AyahList keys={keys} emptyLabel="This manzil has no ayat." />

      <nav
        aria-label="Manzil navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/manzil/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Previous</span>
              <span className="mt-1 block font-semibold tracking-title">Manzil {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/manzil/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Next</span>
              <span className="mt-1 block font-semibold tracking-title">Manzil {next}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
