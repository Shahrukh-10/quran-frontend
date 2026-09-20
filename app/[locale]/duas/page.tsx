import { BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllCategories, getAllDuas } from "@/lib/duas";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import "./_duas-hig.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  return {
    title: "Duas — sourced supplications for daily life",
    description:
      "Thirty-five authentic duas from Ṣaḥīḥ al-Bukhārī, Muslim, and the Sunan collections — organized by moment, each with its full citation.",
    alternates: {
      canonical: siteUrl(locale === "en" ? "/duas" : `/${locale}/duas`),
      languages: hreflangLanguages("/duas"),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? "/duas" : `/${locale}/duas`),
      type: "article",
      locale,
      images: mergedOgImages("Duas — sourced supplications for daily life"),
    },
  };
}

// Featured trio — Waking up, Sayyidul Istighfar, Anxiety & grief
const FEATURED_SLUGS = ["waking-up", "istighfar", "anxiety-and-grief"] as const;

export default async function DuasIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const cats = getAllCategories();
  const duas = getAllDuas();
  const byCategoryCount: Record<string, number> = {};
  for (const d of duas) byCategoryCount[d.category] = (byCategoryCount[d.category] ?? 0) + 1;

  const featured = FEATURED_SLUGS.map((slug) => duas.find((d) => d.slug === slug)).filter(
    (x): x is NonNullable<typeof x> => Boolean(x),
  );

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("duas"), url: siteUrl("/duas") },
        ]}
      />
      <FaqSchema
        items={[
          {
            question: "What is a dua in Islam?",
            answer:
              "A duʿāʾ (دُعَاء) is a personal supplication or invocation to Allah — distinct from ṣalāh (the formal five daily prayers). Duas can be recited in any language and at any time, though the Prophet Muḥammad ﷺ taught many specific duas for specific moments.",
          },
          {
            question: "Where do the duas on this site come from?",
            answer:
              "Every dua on this site is from a classical source — the Ṣaḥīḥayn (Bukhārī and Muslim), the four Sunan (Abū Dāwūd, at-Tirmidhī, an-Nasāʾī, Ibn Mājah), or directly from the Quran itself. The exact hadith number is cited on each entry.",
          },
          {
            question: "Do I have to say the dua in Arabic?",
            answer:
              "No. Duas may be said in any language. The Arabic text is provided for those learning or memorizing the Prophetic wording; transliteration helps with pronunciation; the translation preserves the meaning.",
          },
        ]}
      />

      <section className="duas-hero">
        <div className="container container--narrow">
          <h1>Duas</h1>
          <p>
            Thirty-five sourced supplications for daily life and difficult moments. Every dua
            carries its citation.
          </p>
        </div>
      </section>

      <div className="search-bar">
        <div className="container container--narrow">
          <div className="search-field">
            <input
              type="search"
              placeholder="Search duas by topic, word, or moment"
              aria-label="Search duas"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="container container--narrow">
        <section className="section">
          <h2>Categories</h2>
          <p className="section__caption">Browse by moment or need.</p>
          <div className="categories">
            {cats.map((c) => (
              <Link key={c.slug} className="cat" href={`/duas/${c.slug}`}>
                <div>
                  <div className="cat__title">{c.title[lang]}</div>
                  <div className="cat__count">{byCategoryCount[c.slug] ?? 0} duas</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>Featured duas</h2>
          <p className="section__caption">Three of the most-often taught supplications.</p>
          <div className="featured-list">
            {featured.map((d, i) => (
              <details key={d.slug} className="dua" open={i === 0}>
                <summary>
                  <div>
                    <div className="dua__title">{d.title[lang]}</div>
                    <div className="dua__source">{d.source}</div>
                  </div>
                </summary>
                <div className="dua__body">
                  <p className="dua__arabic" dir="rtl" lang="ar">
                    {d.arabic}
                  </p>
                  <p className="dua__translit">{d.transliteration}</p>
                  <p className="dua__translation">&ldquo;{d.translation[lang]}&rdquo;</p>
                  <p className="dua__cite">Source: {d.source}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
