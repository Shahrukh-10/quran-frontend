// /quran/read/juz/[n] — single Juz PDF viewer.
// Server component wraps a client PdfViewer. Static params: 30 juz × locales.

import { PdfViewer } from "@/components/quran/pdf-viewer";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getPlanById } from "@/lib/plans";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const params: Array<{ locale: string; n: string }> = [];
  for (const locale of locales) {
    for (let n = 1; n <= 30; n++) params.push({ locale, n: String(n) });
  }
  return params;
}

type Props = { params: Promise<{ locale: string; n: string }> };

function splitTitle(title: string): { english: string; arabic: string } {
  const parts = title.split("—");
  if (parts.length < 2) return { english: title.trim(), arabic: "" };
  return { english: parts[0]!.trim(), arabic: parts.slice(1).join("—").trim() };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, n } = await params;
  const bc = await breadcrumbs(locale);
  const num = Number.parseInt(n, 10);
  if (!Number.isInteger(num) || num < 1 || num > 30) return {};
  return {
    title: `Juz ${num} · Read Quran (PDF)`,
    description: `Read Juz ${num} of the Holy Quran in Indian/Pakistani (Indopak) script.`,
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/quran/read/juz/${num}` : `/${locale}/quran/read/juz/${num}`,
      ),
      languages: hreflangLanguages(`/quran/read/juz/${num}`),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/quran/read/juz/${num}` : `/${locale}/quran/read/juz/${num}`,
      ),
    },
  };
}

export default async function JuzReadPage({ params }: Props) {
  const { locale, n } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const num = Number.parseInt(n, 10);
  if (!Number.isInteger(num) || num < 1 || num > 30) notFound();

  const plan = await getPlanById("quran-in-a-month");
  const day = plan?.days.find((d) => d.juz === num);
  const { english, arabic } = splitTitle(day?.title ?? `Juz ${num}`);

  const prev = num > 1 ? num - 1 : null;
  const next = num < 30 ? num + 1 : null;

  return (
    <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: "Read (PDF)", url: siteUrl("/quran/read") },
          { name: `Juz ${num}`, url: siteUrl(`/quran/read/juz/${num}`) },
        ]}
      />

      <div className="mb-6">
        <Link
          href="/quran/read"
          className="focus-ring inline-flex items-center rounded-lg text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← All 30 Juz
        </Link>
      </div>

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">{english}</p>
        <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
          Juz {num}
          {arabic && <span className="ml-3 text-muted-foreground">· {arabic}</span>}
        </h1>
      </header>

      <PdfViewer file={`/pdfs/juz-${num}.pdf`} />

      <nav
        aria-label="Juz navigation"
        className="mt-12 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/read/juz/${prev}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground uppercase tracking-widest">
                Previous
              </span>
              <span className="mt-1 block font-semibold">Juz {prev}</span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/read/juz/${next}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground uppercase tracking-widest">
                Next
              </span>
              <span className="mt-1 block font-semibold">Juz {next}</span>
            </Link>
          )}
        </div>
      </nav>

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
