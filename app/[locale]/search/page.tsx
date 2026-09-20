// /search — full-Quran search across Arabic (diacritics-agnostic), English
// translations (Sahih Intl / Yusuf Ali / Pickthall), and transliteration.
//
// Server rendered — the query and results come back on every request via
// searchParams. Zero client JS beyond the existing header search box (if any).

import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { Link } from "@/i18n/routing";
import { searchQuran } from "@/lib/quran-search";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; lang?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} · Quran` : "Search the Quran",
    description: q
      ? `Quran search results for “${q}”.`
      : "Search the Quran by Arabic, translation, transliteration, or verse reference (e.g. 2:255).",
    // Search pages are noindex — thin, high-cardinality.
    robots: { index: false, follow: true },
    alternates: {
      canonical: siteUrl(q ? `/search?q=${encodeURIComponent(q)}` : "/search"),
    },
    openGraph: {
      url: siteUrl(q ? `/search?q=${encodeURIComponent(q)}` : "/search"),
    },
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  const { q = "", lang = "any" } = await searchParams;
  setRequestLocale(locale);

  const trimmed = q.trim();
  const { hits, interpretedAs } = trimmed
    ? await searchQuran(trimmed, {
        limit: 100,
        language: (lang as "any" | "en" | "ar" | "translit") ?? "any",
      })
    : { hits: [], interpretedAs: undefined };

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("search"), url: siteUrl("/search") },
        ]}
      />

      <header>
        <p className="text-sm text-muted-foreground uppercase tracking-widest">Search</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">
          Search the Quran
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Try Arabic (with or without diacritics), English (Sahih, Yusuf Ali, Pickthall),
          transliteration, or a verse reference like <code>2:255</code>.
        </p>
      </header>

      <form
        method="get"
        action={locale === "en" ? "/search" : `/${locale}/search`}
        className="mt-8 flex flex-wrap items-end gap-3"
      >
        <label className="flex-1 min-w-[260px]">
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Query
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="mercy · ٱلرَّحْمَـٰن · 2:255"
            className="focus-ring w-full rounded-lg border border-separator bg-background px-3 h-11 text-base"
          />
        </label>
        <label>
          <span className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">
            Language
          </span>
          <select
            name="lang"
            defaultValue={lang}
            className="focus-ring h-11 rounded-lg border border-separator bg-background px-3 text-sm"
          >
            <option value="any">Any</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="translit">Transliteration</option>
          </select>
        </label>
        <button
          type="submit"
          className="focus-ring h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-[hsl(var(--accent-foreground))] hover:bg-accent/90"
        >
          Search
        </button>
      </form>

      {trimmed && (
        <section className="mt-10">
          <p className="text-sm text-muted-foreground">
            {interpretedAs ? (
              <>
                Interpreted as: <strong className="text-foreground">{interpretedAs}</strong>
              </>
            ) : (
              <>
                <strong className="text-foreground">{hits.length}</strong>{" "}
                {hits.length === 1 ? "match" : "matches"}
                {hits.length === 100 ? " (showing first 100)" : ""} for “
                <strong className="text-foreground">{trimmed}</strong>”
              </>
            )}
          </p>

          {hits.length === 0 && !interpretedAs && (
            <div className="mt-6 rounded-2xl border border-separator bg-surface p-6 text-sm">
              <p>
                No ayat matched. Try a shorter query, a different translation, or a verse reference
                like <code>2:255</code>.
              </p>
            </div>
          )}

          <ol className="mt-6 space-y-4">
            {hits.map((h) => (
              <li key={h.key}>
                <Link
                  href={`/quran/${h.surahSlug}/${h.ayah}`}
                  className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors duration-micro ease-spring"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-accent">
                      {h.surahName} · {h.surah}:{h.ayah}
                    </span>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      {h.field}
                    </span>
                  </div>
                  <p
                    className={`mt-2 leading-relaxed ${
                      h.field === "arabic" ? "font-quran text-xl text-right" : "text-sm"
                    }`}
                    lang={h.field === "arabic" ? "ar" : undefined}
                    dir={h.field === "arabic" ? "rtl" : undefined}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: highlighter output is HTML-escaped and only injects <mark> tags for match highlighting.
                    dangerouslySetInnerHTML={{ __html: h.snippet }}
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
