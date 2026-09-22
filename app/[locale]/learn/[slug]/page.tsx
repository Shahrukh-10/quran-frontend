import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { FIGURES, getFigureBySlug } from "@/lib/figures";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const locale of locales) {
    for (const f of FIGURES) {
      params.push({ locale, slug: f.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const bc = await breadcrumbs(locale);
  const f = getFigureBySlug(slug);
  if (!f) return {};
  const description = f.body.slice(0, 155) + (f.body.length > 155 ? "…" : "");
  return {
    title: `${f.name}${f.epithet ? ` — ${f.epithet}` : ""}`,
    description,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/learn/${slug}` : `/${locale}/learn/${slug}`),
      languages: hreflangLanguages(`/learn/${slug}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/learn/${slug}` : `/${locale}/learn/${slug}`),
    },
  };
}

export default async function FigurePage({ params }: Props) {
  const { locale, slug } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const f = getFigureBySlug(slug);
  if (!f) notFound();

  const url = siteUrl(locale === "en" ? `/learn/${slug}` : `/${locale}/learn/${slug}`);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("learn"), url: siteUrl("/learn") },
          { name: f.name, url },
        ]}
      />
      <ArticleSchema
        headline={`${f.name}${f.epithet ? ` — ${f.epithet}` : ""}`}
        description={f.body}
        url={url}
        datePublished="2026-09-18T00:00:00Z"
      />

      <Link href="/learn" className="focus-ring text-sm text-accent hover:underline">
        ← All figures
      </Link>

      <header className="mt-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{f.tag}</p>
        <h1 className="mt-2 text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-display leading-tight">
          {f.name}
        </h1>
        <p
          lang="ar"
          dir="rtl"
          className="mt-2 font-arabic text-3xl text-muted-foreground text-right"
        >
          {f.nameArabic}
        </p>
        {f.epithet && (
          <p className="mt-3 text-lg text-muted-foreground italic leading-relaxed">{f.epithet}</p>
        )}
      </header>

      {(f.born || f.died || f.region) && (
        <dl className="mt-8 grid gap-4 sm:grid-cols-3 rounded-2xl border border-separator bg-surface p-6">
          {f.born && (
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Born</dt>
              <dd className="mt-1 text-sm font-medium">{f.born}</dd>
            </div>
          )}
          {f.died && (
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">Died</dt>
              <dd className="mt-1 text-sm font-medium">{f.died}</dd>
            </div>
          )}
          {f.region && (
            <div>
              <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Region
              </dt>
              <dd className="mt-1 text-sm font-medium">{f.region}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-8 space-y-4 text-lg leading-relaxed">
        <p>{f.body}</p>
      </div>

      <div className="mt-10 rounded-2xl bg-accent-muted p-6 text-sm">
        <p className="uppercase tracking-widest text-xs font-semibold text-accent mb-2">
          Classical sources
        </p>
        <p className="italic">{f.source}</p>
      </div>

      <div className="mt-10 pt-8 border-t border-separator">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Content on this page is drawn from classical Islamic historical works. Names, dates, and
          biographical facts are cross-referenced across multiple sources; any single-source claim
          is flagged. Report an error on the{" "}
          <Link
            href="/contact"
            className="text-accent underline underline-offset-2 hover:no-underline"
          >
            contact page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
