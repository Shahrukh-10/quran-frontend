import { siteName, siteUrl } from "@/lib/site";

// One typed component per Schema.org shape we use. Keep them stateless and pure.
// Consumers pass a small props shape; the JSON-LD is written inline as a <script>.

type JsonLd = Record<string, unknown>;

function LdJson({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires raw JSON in a script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", String.raw`\u003c`) }}
    />
  );
}

export function OrganizationSchema() {
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": ["Organization", "NGO"],
        "@id": siteUrl("/#organization"),
        name: siteName,
        url: siteUrl("/"),
        logo: siteUrl("/icons/icon-512.png"),
        // Google E-E-A-T signals: sameAs links to social/identity profiles.
        // Add real profiles as they come online; empty array is fine but no
        // less useful than omitting the key.
        sameAs: [],
        knowsAbout: [
          "Quran",
          "Hadith",
          "Dua",
          "Prayer times",
          "Qibla direction",
          "Salah",
          "Hijri calendar",
          "Names of Allah",
          "Islamic learning",
        ],
        publishingPrinciples: siteUrl("/sources"),
        ethicsPolicy: siteUrl("/about"),
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
        "@id": siteUrl("/#website"),
        name: siteName,
        alternateName: ["Quran Daily", "QuranDaily"],
        url: siteUrl("/"),
        inLanguage: ["en", "id", "ar", "fr", "tr", "ur"],
        publisher: {
          "@id": siteUrl("/#organization"),
        },
        // No `potentialAction`/SearchAction: the Sitelinks Searchbox requires a
        // URL that returns a server-rendered results page. `/search` is a
        // client-only UI (disallowed in robots.txt) and `/quran?q=` filters
        // client-side, so a SearchAction here would fail Google's eligibility
        // test and suppress the searchbox. Re-add once an SSR search route exists.
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

export function SiteNavigationSchema() {
  const items = [
    ["Quran", "/quran"],
    ["Hadith", "/hadith"],
    ["Duas", "/duas"],
    ["Prayer Times", "/prayer-times"],
    ["Qibla", "/qibla"],
    ["Learn Salah", "/learn-salah"],
    ["99 Names of Allah", "/names-of-allah"],
    ["Sources", "/sources"],
  ] as const;
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": siteUrl("/#primary-navigation"),
        name: "Quran Daily primary sections",
        itemListElement: items.map(([name, path], index) => ({
          "@type": "SiteNavigationElement",
          position: index + 1,
          name,
          url: siteUrl(path),
        })),
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
  image,
}: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  // Absolute URL of the article's lead image. Falls back to the site OG image
  // (required by Google for Article rich-result eligibility).
  image?: string;
}) {
  // A named byline (anything other than the org name) → model as a Person on a
  // BlogPosting, which is the E-E-A-T signal Google expects for editorial
  // content. Otherwise a plain Organization-authored Article.
  const isPersonAuthor = Boolean(author && author !== siteName);
  return (
    <LdJson
      data={{
        "@context": "https://schema.org",
        "@type": isPersonAuthor ? "BlogPosting" : "Article",
        headline,
        description,
        url,
        datePublished,
        dateModified,
        image: image
          ? { "@type": "ImageObject", url: image }
          : { "@type": "ImageObject", url: siteUrl("/opengraph-image"), width: 1200, height: 630 },
        author: isPersonAuthor
          ? { "@type": "Person", name: author }
          : { "@type": "Organization", name: siteName, url: siteUrl("/") },
        publisher: {
          "@type": "Organization",
          name: siteName,
          url: siteUrl("/"),
          logo: {
            "@type": "ImageObject",
            url: siteUrl("/icons/icon-512.png"),
            width: 512,
            height: 512,
          },
        },
        mainEntityOfPage: url,
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
        description: `Surah ${surahName}, chapter ${surahNumber} of the Quran, with ${ayahCount} verses.`,
        url,
        about: revelation === "meccan" ? "Makkan revelation" : "Madinan revelation",
        isPartOf: {
          "@type": "Book",
          "@id": siteUrl("/quran"),
          name: "The Qur'an",
          alternateName: ["Qur'an", "Koran", "Al-Qur'ān"],
          // No `author`: the Qur'an is held to be divine revelation, so naming
          // a human author (schema.org `Book.author` convention) is both
          // theologically wrong and risks bad Knowledge Graph associations.
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
