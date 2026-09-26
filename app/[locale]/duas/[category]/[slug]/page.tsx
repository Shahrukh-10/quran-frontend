import { DuaBookmarkButton } from "@/components/duas/dua-bookmark-button";
import { ArticleSchema, BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllCategories, getAllDuas, getCategory, getDua, getDuasInCategory } from "@/lib/duas";
import { hreflangLanguages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const params: Array<{ locale: string; category: string; slug: string }> = [];
  for (const locale of locales) {
    for (const d of getAllDuas()) {
      params.push({ locale, category: d.category, slug: d.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; category: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category, slug } = await params;
  const d = getDua(category, slug);
  if (!d) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const translationSnippet = d.translation[lang];
  const citation = d.reference ? `${d.source} · ${d.reference}` : d.source;
  const composed = `${translationSnippet} — ${citation}${d.grading ? ` (${d.grading})` : ""}. Read in Arabic, transliteration, and English. When to recite: ${d.when[lang]}`;
  const title = `${d.title[lang]} — Dua in Arabic, Transliteration & English`;
  return {
    title: title.slice(0, 70),
    description: composed.length > 260 ? `${composed.slice(0, 257)}…` : composed,
    keywords: [
      d.title[lang],
      `${d.title[lang]} dua`,
      `${d.title[lang]} in Arabic`,
      "dua",
      "supplication",
      "Islamic prayer",
      d.source,
      d.reference || "",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/duas/${category}/${slug}` : `/${locale}/duas/${category}/${slug}`,
      ),
      languages: hreflangLanguages(`/duas/${category}/${slug}`),
    },
    openGraph: {
      title: title.slice(0, 90),
      description: translationSnippet,
      url: siteUrl(
        locale === "en" ? `/duas/${category}/${slug}` : `/${locale}/duas/${category}/${slug}`,
      ),
      type: "article",
    },
  };
}

export default async function DuaPage({ params }: Props) {
  const { locale, category, slug } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const cat = getCategory(category);
  const d = getDua(category, slug);
  if (!cat || !d) notFound();

  const t = await getTranslations({ locale, namespace: "duas.dua" });
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  const relatedDuas = getDuasInCategory(category)
    .filter((x) => x.slug !== slug)
    .slice(0, 6);

  const otherCategories = getAllCategories()
    .filter((c) => c.slug !== category)
    .slice(0, 6);

  const faqItems = [
    {
      q: `When should you recite "${d.title.en}"?`,
      a: d.when.en,
    },
    {
      q: `What is the source of "${d.title.en}"?`,
      a: `This dua is narrated from ${d.source}${d.reference ? ` (${d.reference})` : ""}${d.grading ? ` and is graded ${d.grading}` : ""}.`,
    },
    {
      q: `What does "${d.title.en}" mean in English?`,
      a: `${d.translation.en} — This is the English translation of the Arabic supplication. Transliteration: ${d.transliteration}.`,
    },
    {
      q: `What is the transliteration of "${d.title.en}"?`,
      a: `The transliteration is: ${d.transliteration}. This helps non-Arabic speakers pronounce the dua correctly while learning the Arabic text.`,
    },
  ];

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("duas"), url: siteUrl("/duas") },
          { name: cat.title.en, url: siteUrl(`/duas/${category}`) },
          { name: d.title.en, url: siteUrl(`/duas/${category}/${slug}`) },
        ]}
      />
      <ArticleSchema
        headline={d.title[lang]}
        description={d.translation[lang]}
        url={siteUrl(`/duas/${category}/${slug}`)}
        datePublished="2026-09-18"
      />
      <FaqSchema items={faqItems.map((f) => ({ question: f.q, answer: f.a }))} />

      {/* Visible breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-accent hover:underline">
          {bc("home")}
        </Link>
        <span className="mx-2">›</span>
        <Link href="/duas" className="hover:text-accent hover:underline">
          {bc("duas")}
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={`/duas/${category}` as "/duas/[category]"}
          className="hover:text-accent hover:underline"
        >
          {cat.title[lang]}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{d.title[lang]}</span>
      </nav>

      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {cat.title[lang]} · Dua
          </p>
          <h1 className="mt-1 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display leading-tight">
            {d.title[lang]}
          </h1>
          {/* Server-rendered translation snippet — content in initial HTML */}
          <p className="mt-3 text-base leading-relaxed text-muted-foreground italic">
            "{d.translation[lang]}"
          </p>
        </div>
        <DuaBookmarkButton slug={`${category}/${slug}`} />
      </header>

      <p
        lang="ar"
        dir="rtl"
        className="mt-8 font-quran text-4xl md:text-5xl text-right"
        style={{ lineHeight: 2.2, wordSpacing: "0.08em" }}
      >
        {d.arabic}
      </p>

      <p className="mt-6 italic text-muted-foreground leading-relaxed">
        <span className="block text-xs uppercase tracking-widest not-italic">Transliteration</span>
        <span className="mt-1 block text-lg">{d.transliteration}</span>
      </p>

      <div className="mt-6">
        <span className="block text-xs uppercase tracking-widest text-muted-foreground">
          Translation
        </span>
        <p className="mt-1 leading-relaxed text-lg">{d.translation[lang]}</p>
      </div>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-separator bg-surface p-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("whenTitle")}
          </h2>
          <p className="mt-2 leading-relaxed">{d.when[lang]}</p>
        </div>
        <div className="rounded-2xl border border-separator bg-surface p-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("referenceTitle")}
          </h2>
          <p className="mt-2">
            <span className="block text-xs text-muted-foreground">{t("sourceLabel")}</span>
            <span className="block">{d.source}</span>
          </p>
          {d.reference && (
            <p className="mt-3">
              <span className="block text-xs text-muted-foreground">Reference</span>
              <span className="block">{d.reference}</span>
            </p>
          )}
          {d.grading && (
            <p className="mt-3">
              <span className="block text-xs text-muted-foreground">{t("gradingLabel")}</span>
              <span className="block">{d.grading}</span>
            </p>
          )}
        </div>
      </section>

      {/* About this category */}
      <section
        className="mt-10 rounded-2xl border border-separator bg-surface p-6"
        aria-labelledby="about-cat-heading"
      >
        <h2 id="about-cat-heading" className="text-lg font-bold tracking-title">
          About {cat.title[lang]} duas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {cat.description[lang]}
        </p>
        <p className="mt-3 text-sm">
          <Link
            href={`/duas/${category}` as "/duas/[category]"}
            className="text-accent hover:underline"
          >
            Browse all {cat.title[lang]} duas →
          </Link>
        </p>
      </section>

      {/* Related duas */}
      {relatedDuas.length > 0 && (
        <section className="mt-10" aria-labelledby="related-duas-heading">
          <h2 id="related-duas-heading" className="text-lg font-bold tracking-title">
            More duas in {cat.title[lang]}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {relatedDuas.map((rd) => (
              <Link
                key={rd.slug}
                href={`/duas/${category}/${rd.slug}` as "/duas/[category]/[slug]"}
                className="focus-ring rounded-xl border border-separator bg-surface p-4 hover:bg-muted transition-colors"
              >
                <span className="block text-sm font-semibold">{rd.title[lang]}</span>
                <span className="mt-1 block text-xs text-muted-foreground line-clamp-2">
                  {rd.translation[lang].slice(0, 100)}
                  {rd.translation[lang].length > 100 ? "…" : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Other categories */}
      <section className="mt-10" aria-labelledby="other-cats-heading">
        <h2 id="other-cats-heading" className="text-lg font-bold tracking-title">
          Explore duas by occasion
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {otherCategories.map((oc) => (
            <Link
              key={oc.slug}
              href={`/duas/${oc.slug}` as "/duas/[category]"}
              className="focus-ring rounded-full border border-separator bg-surface px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {oc.title[lang]}
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ block */}
      <section className="mt-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-bold tracking-title">
          Frequently asked
        </h2>
        <div className="mt-4 space-y-4">
          {faqItems.map((f) => (
            <details key={f.q} className="rounded-2xl border border-separator bg-surface p-5">
              <summary className="cursor-pointer text-base font-semibold">{f.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
