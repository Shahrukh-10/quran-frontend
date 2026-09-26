import { HadithAudioButton } from "@/components/hadith/audio-button";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getBook, loadHadith, HADITH_BOOKS } from "@/lib/hadith";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

// Weekly ISR — one hadith per URL, generated on demand and cached at the edge.
// Building 34,259 × 6 locales at ship time is unnecessary; the backend is fast
// and the CDN handles the rest.
export const revalidate = 604800;
export const dynamicParams = true;

export function generateStaticParams() {
  const params: Array<{ locale: string; book: string; number: string }> = [];
  const books = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"];
  const localeList = ["en", "id", "ar", "ur", "tr", "fr"];
  for (const locale of localeList) {
    for (const book of books) {
      params.push({ locale, book, number: "1" });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; book: string; number: string }> };

function isValidNumber(raw: string): boolean {
  return /^\d+(?:\.\d+)?$/.test(raw);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, book, number } = await params;
  const b = getBook(book);
  if (!b || !isValidNumber(number)) return {};
  const h = await loadHadith(b.slug, number);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const trans = h?.translation?.[lang] || h?.translation?.en || "";
  const desc = trans
    ? `${trans.slice(0, 180)}${trans.length > 180 ? "…" : ""} — ${b.name[lang]} #${number}${h?.grade ? `, graded ${h.grade}` : ""}. Compiled by ${b.compiler[lang]}.`
    : `Hadith ${number} from ${b.name[lang]}, compiled by ${b.compiler[lang]}.`;
  const title = trans
    ? `${b.name[lang]} #${number} — "${trans.slice(0, 45)}${trans.length > 45 ? "…" : ""}"`
    : `${b.name[lang]} · Hadith ${number}`;
  return {
    title: title.slice(0, 70),
    description: desc.slice(0, 300),
    keywords: [
      `${b.name[lang]} ${number}`,
      `${b.name[lang]} Hadith ${number}`,
      `hadith ${number}`,
      b.name[lang],
      b.compiler[lang],
      b.arabicName,
      "hadith",
      "sunnah",
      h?.grade || "",
    ].filter(Boolean).join(", "),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/hadith/${book}/${number}` : `/${locale}/hadith/${book}/${number}`,
      ),
      languages: hreflangLanguages(`/hadith/${book}/${number}`),
    },
    openGraph: {
      title: title.slice(0, 90),
      description: trans || `Hadith ${number} from ${b.name[lang]}.`,
      url: siteUrl(
        locale === "en" ? `/hadith/${book}/${number}` : `/${locale}/hadith/${book}/${number}`,
      ),
      type: "article",
    },
  };
}

export default async function HadithDetailPage({ params }: Props) {
  const { locale, book, number } = await params;
  const b = getBook(book);
  if (!b) notFound();
  if (!isValidNumber(number)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hadith.detail" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const h = await loadHadith(b.slug, number);
  if (!h) notFound();

  const englishText = h.translation.en || h.translation[lang] || "";
  const displayText = h.translation[lang] || h.translation.en || "";

  // Related hadith numbers — one before, one after (if the numbers are integers)
  const numInt = Number.parseInt(number, 10);
  const prevNum = Number.isInteger(numInt) && numInt > 1 ? String(numInt - 1) : null;
  const nextNum = Number.isInteger(numInt) && numInt < b.totalHadith ? String(numInt + 1) : null;

  // Other books cross-links (for internal linking + related-content signal)
  const otherBooks = HADITH_BOOKS.filter((x) => x.slug !== b.slug).slice(0, 5);

  const faqs = [
    {
      q: `What does ${b.name.en} Hadith ${number} say?`,
      a: englishText
        ? `${englishText} This narration is recorded in ${b.name.en} (${b.arabicName}), the ${b.eraCE} collection compiled by ${b.compiler.en}.`
        : `${b.name.en} Hadith ${number} — text unavailable in the current data source.`,
    },
    {
      q: `Is ${b.name.en} Hadith ${number} authentic?`,
      a: h.grade
        ? `${b.name.en} Hadith ${number} is graded ${h.grade}. Grading indicates the reliability of the chain of narrators (isnad) and the text (matn). ${b.description.en}`
        : `Authenticity grading for this specific narration is not listed in our current data source. As a general rule, ${b.name.en} is one of the six canonical Sunni collections — ${b.description.en}`,
    },
    {
      q: `Who compiled ${b.name.en}?`,
      a: `${b.name.en} was compiled by ${b.compiler.en} (${b.compilerArabic}), completed around ${b.eraCE}. The collection contains approximately ${b.totalHadith.toLocaleString()} narrations in total. ${b.description.en}`,
    },
    {
      q: `How many hadith are in ${b.name.en}?`,
      a: `${b.name.en} contains approximately ${b.totalHadith.toLocaleString()} hadith. It is one of the six canonical Sunni hadith collections known as Kutub as-Sittah (The Six Books).`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("hadith"), url: siteUrl("/hadith") },
          { name: b.name[lang], url: siteUrl(`/hadith/${b.slug}`) },
          {
            name: `#${number}`,
            url: siteUrl(`/hadith/${b.slug}/${number}`),
          },
        ]}
      />
      <ArticleSchema
        headline={`${b.name[lang]} · Hadith ${number}`}
        description={displayText}
        url={siteUrl(`/hadith/${b.slug}/${number}`)}
        datePublished="2026-09-19"
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD injection
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Visible breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/hadith" className="hover:text-accent hover:underline">
          {t("hadith")}
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={`/hadith/${b.slug}` as "/hadith/[book]"}
          className="hover:text-accent hover:underline"
        >
          {b.name[lang]}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">#{number}</span>
      </nav>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {b.name[lang]} · {b.arabicName}
          </p>
          <h1 className="mt-1 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
            {b.name[lang]} · Hadith {number}
          </h1>
          {/* Server-rendered snippet under H1 — gives Google & AI answer engines
              the actual narration text in the initial HTML, not after JS hydration. */}
          {displayText && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground italic">
              "{displayText.slice(0, 220)}{displayText.length > 220 ? "…" : ""}"
            </p>
          )}
        </div>
        {h.arabic ? <HadithAudioButton arabic={h.arabic} size="md" /> : null}
      </header>

      {/* Arabic text */}
      {h.arabic ? (
        <section
          className="mt-8"
          aria-labelledby="arabic-heading"
        >
          <h2 id="arabic-heading" className="sr-only">
            Arabic text of {b.name.en} Hadith {number}
          </h2>
          <p
            lang="ar"
            dir="rtl"
            className="font-quran text-4xl leading-[2.2] text-right"
          >
            {h.arabic}
          </p>
        </section>
      ) : null}

      {/* Translation */}
      {displayText && (
        <section
          className="mt-8"
          aria-labelledby="translation-heading"
        >
          <h2 id="translation-heading" className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Translation
          </h2>
          <p className="mt-2 text-lg leading-relaxed">{displayText}</p>
        </section>
      )}

      {/* Reference & authenticity block */}
      <section
        className="mt-8 rounded-2xl border border-separator bg-surface p-5"
        aria-labelledby="reference-heading"
      >
        <h2
          id="reference-heading"
          className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Reference
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Collection</dt>
            <dd className="mt-1 font-semibold">
              {b.name[lang]} ({b.arabicName})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Number</dt>
            <dd className="mt-1 font-semibold">#{number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Compiled by</dt>
            <dd className="mt-1">
              {b.compiler[lang]} · <span lang="ar" dir="rtl">{b.compilerArabic}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Era</dt>
            <dd className="mt-1">{b.eraCE}</dd>
          </div>
          {h.grade && (
            <div>
              <dt className="text-xs text-muted-foreground">Authenticity grading</dt>
              <dd className="mt-1">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {h.grade}
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Total in collection</dt>
            <dd className="mt-1">~{b.totalHadith.toLocaleString()} hadith</dd>
          </div>
        </dl>
      </section>

      {/* About-this-collection block */}
      <section
        className="mt-8 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="about-book-heading"
      >
        <h2 id="about-book-heading" className="text-lg font-bold tracking-title">
          About {b.name[lang]}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {b.description[lang]}
        </p>
        <p className="mt-3 text-sm">
          <Link
            href={`/hadith/${b.slug}` as "/hadith/[book]"}
            className="text-accent hover:underline"
          >
            Browse all {b.totalHadith.toLocaleString()} hadith in {b.name[lang]} →
          </Link>
        </p>
      </section>

      {/* Related — adjacent hadith numbers */}
      {(prevNum || nextNum) && (
        <section className="mt-8" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-lg font-bold tracking-title">
            Nearby hadith in {b.name[lang]}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {prevNum && (
              <Link
                href={`/hadith/${b.slug}/${prevNum}` as "/hadith/[book]/[number]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Previous · {b.name[lang]} #{prevNum}
                </span>
                <span className="mt-2 block text-sm font-semibold">
                  Read Hadith {prevNum}
                </span>
              </Link>
            )}
            {nextNum && (
              <Link
                href={`/hadith/${b.slug}/${nextNum}` as "/hadith/[book]/[number]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-5 hover:bg-muted transition-colors"
              >
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Next · {b.name[lang]} #{nextNum}
                </span>
                <span className="mt-2 block text-sm font-semibold">
                  Read Hadith {nextNum}
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Other hadith books — internal link hub for the hadith cluster */}
      <section className="mt-8" aria-labelledby="other-books-heading">
        <h2 id="other-books-heading" className="text-lg font-bold tracking-title">
          Explore the other canonical collections
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Kutub as-Sittah — the six canonical Sunni hadith collections.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {otherBooks.map((ob) => (
            <Link
              key={ob.slug}
              href={`/hadith/${ob.slug}` as "/hadith/[book]"}
              className="focus-ring rounded-xl border border-separator bg-surface p-4 hover:bg-muted transition-colors"
            >
              <span className="block text-sm font-semibold">{ob.name[lang]}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {ob.totalHadith.toLocaleString()} hadith · {ob.eraCE}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ block — AEO/GEO gold. */}
      <section className="mt-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-bold tracking-title">
          Frequently asked about {b.name[lang]} Hadith {number}
        </h2>
        <div className="mt-4 space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <summary className="cursor-pointer text-base font-semibold">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mt-10 pt-6 border-t border-separator text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          {t("source")}: {b.name[lang]} #{number}
        </span>
        {h.grade ? (
          <span>
            {t("grade")}: <span className="text-accent">{h.grade}</span>
          </span>
        ) : null}
        <span>
          {t("compiler")}: {b.compiler[lang]}
        </span>
      </footer>
    </article>
  );
}
