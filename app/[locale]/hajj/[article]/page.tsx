import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllArticles, getArticle } from "@/lib/hajj";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export function generateStaticParams() {
  const params: Array<{ locale: string; article: string }> = [];
  for (const locale of locales) {
    for (const { article } of getAllArticles()) {
      params.push({ locale, article: article.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; article: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, article } = await params;
  const found = getArticle(article);
  if (!found) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const desc = found.article.body[lang].split("\n")[0] ?? "";
  return {
    title: found.article.title[lang],
    description: `${desc.slice(0, 155)}${desc.length > 155 ? "…" : ""}`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/hajj/${article}` : `/${locale}/hajj/${article}`),
      languages: hreflangLanguages(`/hajj/${article}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/hajj/${article}` : `/${locale}/hajj/${article}`),
    },
  };
}

function renderParagraphs(text: string): React.ReactNode[] {
  return text.split(/\n\n+/).map((para, i) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    const children = parts.map((chunk, j) => {
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold text-foreground">
            {chunk.slice(2, -2)}
          </strong>
        );
      }
      return <span key={j}>{chunk}</span>;
    });
    return (
      <p key={i} className="mt-4 first:mt-0 leading-relaxed">
        {children}
      </p>
    );
  });
}

export default async function HajjArticlePage({ params }: Props) {
  const { locale, article } = await params;
  const found = getArticle(article);
  if (!found) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hajj.article" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  const flat = getAllArticles();
  const idx = flat.findIndex(({ article: a }) => a.slug === article);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("hajj"), url: siteUrl("/hajj") },
          {
            name: found.section.title[lang],
            url: siteUrl(`/hajj#section-${found.section.slug}`),
          },
          { name: found.article.title[lang], url: siteUrl(`/hajj/${found.article.slug}`) },
        ]}
      />
      <ArticleSchema
        headline={found.article.title[lang]}
        description={found.article.body[lang].split("\n")[0] ?? ""}
        url={siteUrl(`/hajj/${found.article.slug}`)}
        datePublished="2026-09-19"
      />

      <Link href="/hajj" className="focus-ring text-sm text-accent hover:underline">
        {t("backToHub")}
      </Link>

      <header className="mt-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {found.section.title[lang]}
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title leading-tight">
          {found.article.title[lang]}
        </h1>
      </header>

      <div className="mt-8">{renderParagraphs(found.article.body[lang])}</div>

      {found.article.references.length > 0 && (
        <section
          aria-labelledby="refs-heading"
          className="mt-10 rounded-2xl border border-separator bg-surface p-5"
        >
          <h2 id="refs-heading" className="text-sm font-semibold tracking-title">
            {t("referencesHeading")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {found.article.references.map((r) => (
              <li key={r.ref} className="flex items-baseline gap-2">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.type === "quran" ? t("quran") : t("hadith")}
                </span>
                <span>{r.ref}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav
        aria-label={t("navAriaLabel")}
        className="mt-12 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev ? (
            <Link
              href={`/hajj/${prev.article.slug}` as "/hajj/[article]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("previous")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                ← {prev.article.title[lang]}
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <div>
          {next ? (
            <Link
              href={`/hajj/${next.article.slug}` as "/hajj/[article]"}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring text-right"
            >
              <span className="block text-xs text-muted-foreground">{t("next")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                {next.article.title[lang]} →
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </article>
  );
}
