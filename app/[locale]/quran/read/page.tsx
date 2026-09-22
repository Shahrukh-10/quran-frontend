// /quran/read — landing page linking to the 30-Juz Indopak-script PDF reader.
// Server component. Statically generated for every supported locale.

import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getPlanById } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Read Quran (PDF) · All 30 Juz",
    description:
      "Read the Holy Quran online in Indian/Pakistani (Indopak) script, one Juz at a time. 30 PDFs, offline-ready.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/quran/read" : `/${locale}/quran/read`),
      languages: hreflangLanguages('/quran/read'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/quran/read" : `/${locale}/quran/read`),
    },
  };
}

// The plan title looks like "Juz 1 — Alif Lam Meem". Split on the em-dash so we
// can render the Arabic name separately from the numeric label.
function splitTitle(title: string): { english: string; arabic: string } {
  const parts = title.split("—");
  if (parts.length < 2) return { english: title.trim(), arabic: "" };
  return {
    english: parts[0]!.trim(),
    arabic: parts.slice(1).join("—").trim(),
  };
}

export default async function QuranReadPage({ params }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);

  const plan = await getPlanById("quran-in-a-month");
  const juzDays = (plan?.days ?? []).filter((d) => d.juz !== undefined).slice(0, 30);

  return (
    <article className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: "Read (PDF)", url: siteUrl("/quran/read") },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Quran</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          Read Quran (PDF) · All 30 Juz
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
          Read the Holy Quran online in Indian/Pakistani (Indopak) script, one Juz at a time. 30
          PDFs, offline-ready.
        </p>
      </header>

      <ul
        role="list"
        className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      >
        {Array.from({ length: 30 }, (_, i) => {
          const n = i + 1;
          const day = juzDays.find((d) => d.juz === n);
          const { english, arabic } = splitTitle(day?.title ?? `Juz ${n}`);
          return (
            <li key={n}>
              <Link
                href={`/quran/read/juz/${n}`}
                className="focus-ring flex h-full flex-col justify-between rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
              >
                <span className="text-xs text-muted-foreground uppercase tracking-widest">
                  {english}
                </span>
                {arabic && (
                  <span className="mt-3 text-lg font-semibold tracking-display">{arabic}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-16 text-xs text-muted-foreground text-center">
        Quran PDFs sourced from{" "}
        <a href="https://salahconnect.in" rel="noopener">
          Salah Connect
        </a>{" "}
        (salahconnect.in) — Indopak script.
      </p>
    </article>
  );
}
