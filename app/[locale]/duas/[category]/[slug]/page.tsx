import { DuaBookmarkButton } from "@/components/duas/dua-bookmark-button";
import { ArticleSchema, BreadcrumbSchema, FaqSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllDuas, getCategory, getDua } from "@/lib/duas";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
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
  const bc = await breadcrumbs(locale);
  const d = getDua(category, slug);
  if (!d) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  return {
    title: d.title[lang],
    description: d.translation[lang].slice(0, 155),
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/duas/${category}/${slug}` : `/${locale}/duas/${category}/${slug}`,
      ),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/duas/${category}/${slug}` : `/${locale}/duas/${category}/${slug}`,
      ),
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
      <FaqSchema
        items={[
          { question: `When is "${d.title.en}" recited?`, answer: d.when.en },
          { question: `What is the source of "${d.title.en}"?`, answer: d.source },
        ]}
      />

      <Link href={`/duas/${category}`} className="focus-ring text-sm text-accent hover:underline">
        {t("backToCategory", { category: cat.title[lang] })}
      </Link>

      <header className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display leading-tight">
            {d.title[lang]}
          </h1>
        </div>
        <DuaBookmarkButton slug={`${category}/${slug}`} />
      </header>

      <p
        lang="ar"
        dir="rtl"
        className="mt-8 font-quran text-3xl md:text-4xl leading-[2.4] text-right"
      >
        {d.arabic}
      </p>

      <p className="mt-6 italic text-muted-foreground leading-relaxed">{d.transliteration}</p>

      <p className="mt-4 leading-relaxed text-lg">{d.translation[lang]}</p>

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
          {d.grading && (
            <p className="mt-3">
              <span className="block text-xs text-muted-foreground">{t("gradingLabel")}</span>
              <span className="block">{d.grading}</span>
            </p>
          )}
        </div>
      </section>
    </article>
  );
}
