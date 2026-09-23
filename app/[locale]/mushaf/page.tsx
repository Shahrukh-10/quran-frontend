import { MushafReader } from "@/components/quran/mushaf-reader";
import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { getAllMushafPages } from "@/lib/mushaf";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Read the Muṣḥaf — page-fold Qur'ān",
    description:
      "Read the full Qur'ān as a bound book. The 604-page Madinah muṣḥaf layout with a real page-fold animation, offline-first, resumes where you left off.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/mushaf" : `/${locale}/mushaf`),
      languages: hreflangLanguages('/mushaf'),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/mushaf" : `/${locale}/mushaf`),
    },
  };
}

export default async function MushafPage({ params }: PageProps) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  // Full 604-page Madinah muṣḥaf, built once at server-start / build time.
  const pages = getAllMushafPages();

  return (
    <>
      {/* GEO/AEO — FAQPage schema for AI answer engines (ChatGPT,
          Perplexity, Claude, Google AI Overviews). Seeds citation-eligible
          Q&A that mirrors the highest-intent search queries for this hub.
          English-only for now — JSON-LD is crawler-facing. */}
      <FaqSchema
        items={[
          {
            question: 'What is a Muṣḥaf?',
            answer:
              'A Muṣḥaf (مصحف) is a physical or digital copy of the Quran in its standardized written form — literally "the collected pages." It refers specifically to the compiled Quranic text arranged in its canonical order, as opposed to individual ayat or partial recitations.',
          },
          {
            question: 'How is the Mushaf on Quran Daily arranged?',
            answer:
              'The digital Mushaf mirrors the standard Madinah Mushaf 604-page layout used in most printed copies worldwide. Each page contains 15 lines of the standard Uthmani script, and navigation supports page-by-page reading (/quran/page/[1-604]) in addition to surah-by-surah and juz-by-juz.',
          },
          {
            question: 'What script is used?',
            answer:
              'The Uthmani script (rasm ʿUthmānī), which is the classical script established under Caliph ʿUthmān ibn ʿAffān (RA) in the 7th century CE. Modern printings apply diacritical marks (tashkīl) invented by later scholars for pronunciation clarity, while preserving the original consonantal skeleton.',
          },
          {
            question: 'Can I search inside the Mushaf by Arabic word?',
            answer:
              'Yes — the search bar accepts Arabic words in any diacritic form; the search is diacritic-insensitive and returns every ayah containing the word or root. Root-based search covers all conjugated derivatives, useful for tafsir study.',
          },
          {
            question: 'Which recitation methodology does the audio use?',
            answer:
              'The default audio is the Ḥafṣ ʿan ʿĀṣim reading, which is by far the most widespread recitation methodology worldwide (used in Egypt, the Gulf, and most non-Maghreb Muslim countries). Warsh ʿan Nāfiʿ (common in North and West Africa) is not currently included but may be added in future.',
          },
          {
            question: 'Does the Mushaf work offline?',
            answer:
              'Yes — the entire 6,236-ayah corpus is cached on your device after your first visit via the Progressive Web App service worker. You can read the full Quran with no network connection. Audio recitation requires network the first time and is then cached per-ayah as you listen.',
          },
        ]}
      />
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: "Muṣḥaf reader", url: siteUrl("/mushaf") },
        ]}
      />
      <section className="section section--hero" style={{ paddingTop: 32, paddingBottom: 12 }}>
        <div className="container container--narrow">
          <span className="eyebrow">Muṣḥaf · Page-fold reader</span>
          <h1 className="page-title" style={{ margin: "6px 0 8px" }}>
            Read the Qur&apos;ān as a book.
          </h1>
          <p className="page-lede" style={{ margin: 0, fontSize: 15 }}>
            All {pages.length} pages of the Madinah muṣḥaf, with a real page-fold animation. Swipe,
            click the corners, or use ← / → to turn. Your place is saved on this device.
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="container">
          <MushafReader pages={pages} />
        </div>
      </section>
    </>
  );
}
