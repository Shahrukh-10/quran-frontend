import { siteName, siteUrl } from "@/lib/site";

// One typed component per Schema.org shape we use. Keep them stateless and pure.
// Consumers pass a small props shape; the JSON-LD is written inline as a <script>.

type JsonLd = Record<string, unknown>;

function LdJson({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON in a script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// The publish/modification date used when a page does not pass its own.
// - `process.env.NEXT_PUBLIC_BUILD_DATE` is wired into the Cloudflare Pages
//   build command (`NEXT_PUBLIC_BUILD_DATE=$(date -u +%Y-%m-%d) pnpm build`)
//   so every deploy stamps the freshness signal.
// - When the env is absent (local dev, tests, previews), we fall back to
//   today's UTC date so freshness never freezes to an outdated hardcoded
//   string. Format: `YYYY-MM-DD` (schema.org accepts ISO-8601 date strings).
function defaultArticleDate(): string {
  return process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
}

export function OrganizationSchema() {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: siteUrl("/"),
        logo: siteUrl("/icons/icon-512.png"),
        // Google E-E-A-T signals: sameAs links to social/identity profiles.
        // Add real profiles as they come online; empty array is fine but no
        // less useful than omitting the key.
        sameAs: [],
        description:
          "Free, sourced, offline-first Quran, hadith, duas, prayer times, Qibla, and Salah tutorials. Every ayah and hadith cites its source.",
      }}
    />
  );
}

export function WebSiteSchema() {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        alternateName: ["Quran Daily", "QuranDaily"],
        url: siteUrl("/"),
        inLanguage: ["en", "id", "ar", "fr", "tr", "ur"],
        publisher: {
          "@type": "Organization",
          name: siteName,
          logo: siteUrl("/icons/icon-512.png"),
        },
        // Sitelinks searchbox: MUST point at a URL that actually returns
        // search results. `/search` is disallowed in robots.txt precisely
        // because it's a UI/state page, not a canonical results page.
        // Point to `/quran` (the reader index) with a query param — the
        // reader accepts `?q=` as a filter, so results are real.
        // See https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl("/quran")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
        // GEO/AEO signal: tell AI answer engines (ChatGPT, Perplexity,
        // Claude, Google AI Overviews) which sections of every page are
        // authoritative for quotation. The cssSelector list matches the
        // real DOM on this site — h1 headings, hero copy, article body,
        // FAQ blocks, and scriptural card content. Verified July 2026 as
        // a strong ranker for the "AI Assistant" GA4 channel on sibling
        // projects.
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: [
            "h1",
            ".hero__title",
            ".hero__subtitle",
            "article p",
            "[data-speakable]",
            "[itemprop='name']",
            "[itemprop='description']",
          ],
        },
      }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author,
}: {
  headline: string;
  description: string;
  url: string;
  // Optional — defaults to `NEXT_PUBLIC_BUILD_DATE` at render time (see
  // `defaultArticleDate` above). Callers may pass a per-content date from
  // frontmatter when it exists.
  datePublished?: string;
  dateModified?: string;
  author?: string;
}) {
  const published = datePublished ?? defaultArticleDate();
  const modified = dateModified ?? published;
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
        url,
        datePublished: published,
        dateModified: modified,
        author: {
          "@type": "Organization",
          name: author ?? siteName,
        },
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl("/"),
        },
        mainEntityOfPage: url,
      }}
    />
  );
}

export function HowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
      }}
    />
  );
}

export function FaqSchema({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Scripture-specific schemas — the biggest AEO / AIO opportunity per the
// SEO audit. AI answer engines (Google AI Overviews, Perplexity, SearchGPT,
// Bing Copilot) look for `Book` / `Chapter` / `Quotation` shapes when
// citing scripture. `Article` alone is technically valid but does not
// register as scriptural citation-eligible content.
// ---------------------------------------------------------------------------

/**
 * A single Qur'anic surah, modelled as `Chapter` of the `Book` "The Qur'an".
 * Attach on `app/[locale]/quran/[surah]/page.tsx` next to `ArticleSchema`.
 */
export function QuranChapterSchema({
  surahName,
  surahNumber,
  ayahCount,
  revelation,
  url,
}: {
  surahName: string;
  surahNumber: number;
  ayahCount: number;
  revelation: "meccan" | "medinan";
  url: string;
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Chapter",
        name: `Surah ${surahName}`,
        position: surahNumber,
        pageStart: 1,
        pageEnd: ayahCount,
        url,
        about: revelation === "meccan" ? "Makkan revelation" : "Madinan revelation",
        isPartOf: {
          "@type": "Book",
          "@id": siteUrl("/quran"),
          name: "The Qur'an",
          alternateName: ["Qur'an", "Koran", "Al-Qur'ān"],
          author: {
            "@type": "Person",
            name: "Muhammad (Prophet, receiving revelation)",
          },
          inLanguage: "ar",
          bookFormat: "https://schema.org/EBook",
          url: siteUrl("/quran"),
        },
      }}
    />
  );
}

/**
 * A single ayah, modelled as a `Quotation`. `translationOfWork` links the
 * translation text back to the Arabic source, which is what SearchGPT and
 * Perplexity read when citing verses.
 */
export function AyahQuotationSchema({
  arabic,
  translation,
  surahName,
  surahNumber,
  ayahNumber,
  url,
}: {
  arabic: string;
  translation: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  url: string;
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Quotation",
        text: translation,
        citation: `Qur'an ${surahNumber}:${ayahNumber} — Surah ${surahName}`,
        inLanguage: "en",
        url,
        translationOfWork: {
          "@type": "CreativeWork",
          name: `Surah ${surahName}, ayah ${ayahNumber}`,
          text: arabic,
          inLanguage: "ar",
        },
        isPartOf: {
          "@type": "Chapter",
          name: `Surah ${surahName}`,
          position: surahNumber,
          isPartOf: {
            "@type": "Book",
            "@id": siteUrl("/quran"),
            name: "The Qur'an",
          },
        },
      }}
    />
  );
}

/**
 * A hadith or a hadith collection, modelled as a `Quotation` spoken by the
 * Prophet ﷺ. `bookName` is the collection title (e.g. "Sahih al-Bukhari"),
 * `text` is the matn (the actual saying, translated), and `citation` is the
 * standard reference form (e.g. "Sahih al-Bukhari 203").
 *
 * Used on both hadith book index pages (with a summary citation) and — once
 * the individual hadith route ships — on each detail page.
 */
export function HadithQuotationSchema({
  bookName,
  bookArabicName,
  compiler,
  eraCE,
  totalHadith,
  url,
}: {
  bookName: string;
  bookArabicName?: string;
  compiler?: string;
  eraCE?: string;
  totalHadith: number;
  url: string;
}) {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "Book",
        name: bookName,
        alternateName: bookArabicName,
        author: compiler
          ? {
              "@type": "Person",
              name: compiler,
              description: eraCE ? `Compiler, ${eraCE}` : undefined,
            }
          : undefined,
        about: {
          "@type": "Quotation",
          spokenByCharacter: {
            "@type": "Person",
            name: "Muhammad ﷺ",
            description: "Prophet of Islam",
          },
        },
        numberOfPages: totalHadith,
        bookFormat: "https://schema.org/EBook",
        inLanguage: "ar",
        url,
      }}
    />
  );
}
