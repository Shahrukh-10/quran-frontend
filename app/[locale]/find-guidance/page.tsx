import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { hreflangLanguages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import {
  type Situation,
  getAllSituations,
  getSolutionCard,
  searchSituations,
} from "@/lib/situations";
import { rankSituationsWithAI } from "@/lib/situations-ai";
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
    // BETA — noindex so search engines don't surface it yet
    robots: { index: false, follow: false },
    title: "Find Guidance — Quran, Hadith & Dua for your situation (BETA)",
    description:
      "Describe what you're going through — get authentic, sourced supplications and verses that address your situation. Every entry cites its hadith or Quran reference. This is a study aid, not a fatwā.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/find-guidance" : `/${locale}/find-guidance`),
      languages: hreflangLanguages("/find-guidance"),
    },
  };
}

/** BETA gate. This page is hidden until the user passes `?beta=1`. Public
 *  users get a 404 so nothing goes live before the situations graph is
 *  reviewed by the site owner / a scholar. */
function isBetaEnabled(searchParams: { beta?: string }): boolean {
  return searchParams.beta === "1";
}

export default async function FindGuidancePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  if (!isBetaEnabled(sp)) {
    notFound();
  }

  const bc = await breadcrumbs(locale);
  const query = (sp.q ?? "").trim();
  // Try AI ranking first (Cloudflare Workers AI, free tier) — falls back
  // silently to keyword search if the LLM is unavailable, times out, returns
  // garbage, or exhausts the daily neuron quota. See lib/situations-ai.ts for
  // the strict safety model (LLM only picks IDs, never generates content).
  let matches: Situation[] = [];
  let rankedBy: "ai" | "keyword" | "none" = "none";
  if (query) {
    const aiRanked = await rankSituationsWithAI(query, 5);
    if (aiRanked && aiRanked.length > 0) {
      matches = aiRanked;
      rankedBy = "ai";
    } else {
      matches = searchSituations(query, 5);
      if (matches.length > 0) rankedBy = "keyword";
    }
  }
  const totalSituations = getAllSituations().length;

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
          BETA · Under review
        </p>
        <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display leading-tight">
          Find guidance from the Quran & Sunnah
        </h1>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-prose mx-auto">
          Describe what you&apos;re going through in plain English. We&apos;ll show you authentic
          supplications, verses, and hadiths that address your situation — every one with a full
          citation so you can verify.
        </p>
      </header>

      {/* Search form — GET so results survive refresh & are shareable */}
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
            // biome-ignore lint/a11y/noAutofocus: this IS a dedicated search
            // page whose entire purpose is the input — autofocus is the
            // correct UX (matches Google, DuckDuckGo, etc.)
            autoFocus
            placeholder="e.g. I'm anxious about my exam · my parents are sick · I owe money · I need forgiveness"
            className="focus-ring w-full rounded-2xl border border-separator bg-surface px-5 py-4 pr-32 text-base sm:text-lg shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
          >
            Find
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Try: <em>anxiety</em>, <em>forgiveness</em>, <em>my mother is ill</em>,{" "}
          <em>traveling next week</em>, <em>cannot decide</em>, <em>angry</em>, <em>in debt</em>
        </p>
      </form>

      {/* Prominent disclaimer — always visible above results */}
      <aside
        role="note"
        className="mt-8 rounded-2xl border border-amber-300/50 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="font-semibold">This is a study aid, not a fatwā.</p>
        <p className="mt-1">
          Every dua, verse, and hadith below is authentically sourced and cited — but a mapping
          between a personal situation and a solution is a <em>guidance suggestion</em>, not a
          religious ruling. For your specific situation, please consult a qualified scholar (
          <em>ʿālim / muftī</em>) or a trusted teacher.
        </p>
      </aside>

      {/* Results */}
      {query && (
        <section className="mt-10" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">
              {matches.length > 0 ? `Guidance for "${query}"` : `No exact matches for "${query}"`}
            </h2>
            {rankedBy === "ai" && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-accent"
                title="Cloudflare Workers AI selected these topics from our curated graph — every dua and verse below is still from the same hand-curated, sourced content."
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                AI-ranked
              </span>
            )}
            {rankedBy === "keyword" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Keyword match
              </span>
            )}
          </div>
          {matches.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Our situations library currently covers {totalSituations} common topics. Try a shorter
              word or a different phrasing — e.g. <em>anxiety</em> instead of{" "}
              <em>I&apos;m feeling extremely on edge</em>. If you can&apos;t find what you need,
              browse{" "}
              <Link href="/duas" className="text-accent hover:underline">
                all 37 duas
              </Link>{" "}
              or the{" "}
              <Link href="/quran" className="text-accent hover:underline">
                Quran reader
              </Link>{" "}
              directly.
            </p>
          )}
          <div className="mt-6 space-y-8">
            {matches.map((situation) => (
              <SituationBlock key={situation.id} situation={situation} />
            ))}
          </div>
        </section>
      )}

      {/* Landing state — show topic chips so users know what's covered */}
      {!query && <TopicChips situations={getAllSituations()} />}

      {/* Sources & authenticity — trust panel */}
      <section className="mt-16 rounded-2xl border border-separator bg-surface p-6">
        <h2 className="text-lg font-bold tracking-title">How we chose what to include</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            Every dua below is from the authentic Sunnah — sourced from{" "}
            <em>Ṣaḥīḥ al-Bukhārī, Ṣaḥīḥ Muslim,</em> or one of the four Sunan collections (Abū
            Dāwūd, al-Tirmidhī, al-Nasāʾī, Ibn Mājah).
          </li>
          <li>
            Every ayah is quoted with its verse-key so you can open the full surah in the Quran
            reader.
          </li>
          <li>
            The mapping between situations and solutions is drawn from classical <em>duʿāʾ</em>{" "}
            compilations, primarily <em>Ḥiṣn al-Muslim</em> by Saʿīd al-Qaḥṭānī, <em>al-Adhkār</em>{" "}
            by al-Nawawī, and <em>al-Wābil al-Ṣayyib</em> by Ibn al-Qayyim.
          </li>
          <li>
            <strong>Nothing on this page is generated by AI.</strong> The situations graph is a
            hand-curated JSON file — you can inspect it at{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">data/graph/situations.json</code>
            .
          </li>
        </ul>
      </section>
    </article>
  );
}

/* ---------- Situation block (one topic with N solutions) ---------- */

function SituationBlock({ situation }: { situation: Situation }) {
  const cards = situation.solutions.map((s) => getSolutionCard(s));
  return (
    <div className="rounded-2xl border border-separator bg-surface p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Topic</p>
      <h3 className="mt-1 text-xl font-bold tracking-title">{niceLabel(situation.labels)}</h3>
      <ul className="mt-5 space-y-5">
        {cards.map((c) => (
          <li key={`${c.type}:${c.ref}`}>
            <SolutionCard card={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Take the labels array and produce a human title for the situation block.
 *  Uses the FIRST label with the first letter capitalised — labels are already
 *  ordered from most specific to most general in situations.json. */
function niceLabel(labels: string[]): string {
  const first = labels[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function SolutionCard({
  card,
}: {
  card: ReturnType<typeof getSolutionCard>;
}) {
  return (
    <article className="rounded-xl border border-separator/70 bg-background/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {card.type === "dua" ? "Dua" : card.type === "ayah" ? "Quran" : "Page"}
        </p>
        {card.source && <p className="text-xs text-muted-foreground font-mono">{card.source}</p>}
      </div>
      <h4 className="mt-1 text-base font-semibold">{card.title}</h4>

      {card.arabic && (
        <p
          lang="ar"
          dir="rtl"
          className="mt-3 font-quran text-2xl sm:text-3xl text-right leading-loose"
        >
          {cleanArabicForDisplay(card.arabic)}
        </p>
      )}

      {card.translation && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          &ldquo;{card.translation}&rdquo;
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground italic">
        Why this: {card.reason}
      </p>

      <p className="mt-3">
        <Link
          href={card.href as `/${string}`}
          className="text-sm text-accent hover:underline focus-ring"
        >
          Read the full source →
        </Link>
      </p>
    </article>
  );
}

/* ---------- Topic chips (landing state before the user searches) ---------- */

function TopicChips({ situations }: { situations: ReadonlyArray<Situation> }) {
  const chips = situations.map((s) => ({
    id: s.id,
    label: niceLabel(s.labels),
    example: s.labels[0] ?? s.id,
  }));
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Common topics we can help with
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <a
            key={c.id}
            href={`/find-guidance?beta=1&q=${encodeURIComponent(c.example)}`}
            className="focus-ring rounded-full border border-separator bg-surface px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {c.label}
          </a>
        ))}
      </div>
    </section>
  );
}
