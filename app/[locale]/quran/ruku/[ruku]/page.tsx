// /quran/ruku/[ruku] — read a single ruku (1..558). Rukus are the traditional
// pausing sections used by imams during recitation.

import { AyahList } from "@/components/quran/ayah-list";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { ayatInRuku } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

const TOTAL_RUKUS = 558;

export async function generateStaticParams() {
  const params: Array<{ locale: string; ruku: string }> = [];
  for (const locale of locales) {
    for (let r = 1; r <= TOTAL_RUKUS; r++) params.push({ locale, ruku: String(r) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; ruku: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ruku } = await params;
  const bc = await breadcrumbs(locale);
  const n = Number.parseInt(ruku, 10);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_RUKUS) return {};
  return {
    title: `Ruku ${n} · Quran`,
    description: `Read Ruku ${n} of the Quran, a traditional pausing section used during Salah.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/ruku/${n}` : `/${locale}/quran/ruku/${n}`),
      languages: hreflangLanguages(`/quran/ruku/${n}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/quran/ruku/${n}` : `/${locale}/quran/ruku/${n}`),
    },
  };
}

export default async function RukuPage({ params }: Props) {
  const { locale, ruku } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const n = Number.parseInt(ruku, 10);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_RUKUS) notFound();

  const keys = await ayatInRuku(n);
  if (!keys.length) notFound();

  const prev = n > 1 ? n - 1 : null;
  const next = n < TOTAL_RUKUS ? n + 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: `Ruku ${n}`, url: siteUrl(`/quran/ruku/${n}`) },
        ]}
      />
      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Ruku</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          Ruku {n} of {TOTAL_RUKUS}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {keys[0]} → {keys[keys.length - 1]} · {keys.length} ayat
        </p>
      </header>

      <AyahList keys={keys} />

      <nav
        aria-label="Ruku navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/ruku/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Previous</span>
              <span className="mt-1 block font-semibold tracking-title">Ruku {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/ruku/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">Next</span>
              <span className="mt-1 block font-semibold tracking-title">Ruku {next}</span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
