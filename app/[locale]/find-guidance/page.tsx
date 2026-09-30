import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { type NarrateResult, narrateGuidance } from "@/lib/guidance-narrator";
import { type Match, guidanceSearch } from "@/lib/guidance-search";
import { hreflangLanguages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; beta?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    // BETA — noindex until content is production-reviewed
    robots: { index: false, follow: false },
    title: "Find Guidance — Quran, Hadith & Dua for your situation (BETA)",
    description:
      "Ask any question in plain English. Get grounded, sourced answers from the Quran, authentic hadith, and prophetic supplications — every claim is cited.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/find-guidance" : `/${locale}/find-guidance`),
      languages: hreflangLanguages("/find-guidance"),
    },
  };
}

function isBetaEnabled(searchParams: { beta?: string }): boolean {
  return searchParams.beta === "1";
}

export default async function FindGuidancePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (!isBetaEnabled(sp)) notFound();

  const bc = await breadcrumbs(locale);
  const query = (sp.q ?? "").trim();

  // Retrieve
  let matches: {
    ayah: Match[];
    dua: Match[];
    hadith: Match[];
    mode: "semantic" | "keyword";
  } | null = null;
  let narrated: NarrateResult | null = null;
  if (query) {
    matches = await guidanceSearch(query, 3);
    const flat = [...matches.ayah, ...matches.dua, ...matches.hadith];
    if (flat.length > 0) {
      narrated = await narrateGuidance(query, flat);
    }
  }

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: "Find Guidance", url: siteUrl("/find-guidance") },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">Find Guidance</span>
      </nav>

      <header className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent-muted px-3 py-1 text-xs uppercase tracking-widest text-accent">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          BETA · AI-assisted retrieval over Quran, hadith & duas
        </p>
        <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display leading-tight">
          Ask anything. Get grounded answers.
        </h1>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-prose mx-auto">
          Describe your situation in plain English. We&apos;ll search the Quran, authentic hadith,
          and prophetic duas — and stitch together an answer that cites every source. Nothing is
          fabricated: every quote comes from a real, linked passage.
        </p>
      </header>

      <form action="/find-guidance" method="get" className="mt-8">
        <input type="hidden" name="beta" value="1" />
        <label htmlFor="q" className="sr-only">
          What are you going through?
        </label>
        <div className="relative">
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={query}
            // biome-ignore lint/a11y/noAutofocus: dedicated search page, matching Google/DuckDuckGo UX
            autoFocus
            placeholder="e.g. I'm traveling next week · my father is very sick · I feel completely alone"
            className="focus-ring w-full rounded-2xl border border-separator bg-surface px-5 py-4 pr-32 text-base sm:text-lg shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Ask
          </button>
        </div>
      </form>

      <aside
        role="note"
        className="mt-8 rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="font-semibold">This is a study aid, not a fatwā.</p>
        <p className="mt-1">
          The retrieved sources are authentic. The narrative connecting them is written by an AI
          model constrained to quote only those sources — but a mapping between a situation and a
          verse is a <em>guidance suggestion</em>, not a religious ruling. For your specific case,
          consult a qualified scholar (<em>ʿālim / muftī</em>).
        </p>
      </aside>

      {query && matches && (
        <section className="mt-10" aria-live="polite">
          {/* AI narrative */}
          {narrated?.answer && !narrated.suspected_hallucination && (
            <div className="rounded-2xl border border-separator bg-surface p-6 md:p-8">
              <div className="flex flex-wrap items-baseline gap-2 mb-3">
                <h2 className="text-lg font-semibold">Guidance for &ldquo;{query}&rdquo;</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-accent">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  {matches.mode === "semantic"
                    ? "AI-narrated · semantic search"
                    : "AI-narrated · keyword fallback"}
                </span>
              </div>
              <div className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {narrated.answer}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Citations [S1] [S2] … map to the sources below. Every quote is verbatim from the
                cited source.
              </p>
            </div>
          )}

          {(!narrated || narrated.suspected_hallucination) &&
            matches.ayah.length + matches.dua.length + matches.hadith.length > 0 && (
              <div className="rounded-2xl border border-separator bg-surface p-6">
                <h2 className="text-lg font-semibold">
                  Retrieved sources for &ldquo;{query}&rdquo;
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {narrated?.suspected_hallucination
                    ? "The AI narrator produced suspect output — showing only the raw retrieved passages below."
                    : "The AI narrator was unavailable — showing the top retrieved passages below."}
                </p>
              </div>
            )}

          {matches.ayah.length + matches.dua.length + matches.hadith.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No matches. Try shorter words or different phrasing.
            </p>
          )}

          {/* Retrieved passage cards */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...matches.ayah, ...matches.dua, ...matches.hadith].map((m, i) => (
              <SourceCard key={m.id} match={m} sourceIndex={i + 1} />
            ))}
          </div>
        </section>
      )}

      {!query && (
        <section className="mt-12 rounded-2xl border border-separator bg-surface p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Try asking</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "I feel alone",
              "I am traveling next week",
              "My father has cancer",
              "I owe a lot of money",
              "I cannot forgive myself",
              "I am scared of the future",
              "How do I be a better parent?",
              "I am angry all the time",
            ].map((example) => (
              <li key={example}>
                <Link
                  href={
                    `/find-guidance?beta=1&q=${encodeURIComponent(example)}` as "/find-guidance"
                  }
                  className="block rounded-xl border border-separator bg-background/40 px-4 py-3 text-sm hover:border-accent/40 focus-ring"
                >
                  &ldquo;{example}&rdquo;
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-lg font-bold tracking-title">How this works</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            Every entry in our search corpus (Quran ayahs, prophetic duas, key hadith) has been
            pre-embedded into a semantic vector — no text is generated at query time.
          </li>
          <li>
            When you type a question, we embed it too and retrieve the closest passages by meaning
            (not just keyword match).
          </li>
          <li>
            An AI narrator then writes an answer that <em>must</em> cite each claim to one of the
            retrieved passages. Any citation the model invents is stripped by our validator.
          </li>
          <li>
            If the validator sees signs of hallucination, we show only the raw retrieved passages
            and skip the narrative entirely.
          </li>
          <li>
            <strong>Nothing shown here is invented by AI:</strong> every quote is from the Quran
            reader, the duas collection, or the hadith library on this site.
          </li>
        </ul>
      </section>
    </article>
  );
}

function SourceCard({ match, sourceIndex }: { match: Match; sourceIndex: number }) {
  const kindLabel = match.kind === "ayah" ? "Quran" : match.kind === "dua" ? "Dua" : "Hadith";
  return (
    <article className="rounded-2xl border border-separator/70 bg-background/40 p-5 hover:border-accent/40 transition-colors">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          [S{sourceIndex}] {kindLabel}
        </span>
        <span className="text-[10px] text-muted-foreground/70 font-mono">
          score {match.score.toFixed(2)}
        </span>
      </div>
      <h3 className="text-base font-semibold leading-tight">
        <Link href={match.href as "/quran"} className="hover:text-accent">
          {match.title}
        </Link>
      </h3>
      {match.arabic && (
        <p
          lang="ar"
          dir="rtl"
          className="mt-3 font-quran text-xl text-right leading-loose line-clamp-3"
        >
          {cleanArabicForDisplay(match.arabic)}
        </p>
      )}
      <p className="mt-2 text-sm leading-relaxed text-foreground/90 line-clamp-4">{match.text}</p>
      {match.source && (
        <p className="mt-3 text-xs text-muted-foreground font-mono">{match.source}</p>
      )}
    </article>
  );
}
