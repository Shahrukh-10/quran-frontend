import { HadithVirtualList } from "@/components/hadith/virtual-list";
import {
  BreadcrumbSchema,
  HadithQuotationSchema,
} from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import {
  HADITH_PAGE_SIZE,
  getAllBooks,
  getBook,
  loadHadithPage,
} from "@/lib/hadith";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

// Weekly ISR — regenerate the page every 7 days.
export const revalidate = 604800;

export function generateStaticParams() {
  const params: Array<{ locale: string; book: string }> = [];
  for (const locale of locales) {
    for (const b of getAllBooks()) {
      params.push({ locale, book: b.slug });
    }
  }
  return params;
}

type Props = {
  params: Promise<{ locale: string; book: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readPageParam(sp: Record<string, string | string[] | undefined>): number {
  const raw = sp.page;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = value ? Number.parseInt(value, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, book } = await params;
  const b = getBook(book);
  if (!b) return {};
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  return {
    title: `${b.name[lang]} · ${b.totalHadith.toLocaleString()} hadith`,
    description: b.description[lang],
    alternates: {
      canonical: siteUrl(locale === "en" ? `/hadith/${book}` : `/${locale}/hadith/${book}`),
      languages: hreflangLanguages(`/hadith/${book}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/hadith/${book}` : `/${locale}/hadith/${book}`),
      type: "article",
      locale,
      images: mergedOgImages(`${b.name[lang]} — ${b.totalHadith.toLocaleString()} hadith`),
    },
  };
}

export default async function HadithBookPage({ params, searchParams }: Props) {
  const { locale, book } = await params;
  const sp = await searchParams;
  const b = getBook(book);
  if (!b) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hadith.book" });
  const bc = await breadcrumbs(locale);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";

  const pageOne = readPageParam(sp); // 1-indexed for the URL
  const zeroIdx = pageOne - 1;

  const pageData = await loadHadithPage(b.slug, zeroIdx, HADITH_PAGE_SIZE);
  if (!pageData) {
    return (
      <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <p className="text-sm text-muted-foreground">Hadith service is unavailable.</p>
      </article>
    );
  }

  const totalPages = pageData.totalPages || 1;
  const clampedPage = Math.min(pageOne, totalPages);
  const startIndex = zeroIdx * HADITH_PAGE_SIZE;
  const nextPage = clampedPage < totalPages ? clampedPage + 1 : null;
  const prevPage = clampedPage > 1 ? clampedPage - 1 : null;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: t("hadith"), url: siteUrl("/hadith") },
          { name: b.name[lang], url: siteUrl(`/hadith/${b.slug}`) },
        ]}
      />
      <HadithQuotationSchema
        bookName={b.name[lang]}
        bookArabicName={b.arabicName}
        compiler={b.compiler[lang]}
        eraCE={b.eraCE}
        totalHadith={b.totalHadith}
        url={siteUrl(`/hadith/${b.slug}`)}
      />

      <Link
        href="/hadith"
        className="focus-ring text-sm text-accent hover:underline inline-block"
      >
        {t("backToIndex")}
      </Link>

      <header className="mt-4 text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">{t("collection")}</p>
        <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-display">
          {b.name[lang]}
        </h1>
        <p className="mt-2 font-quran text-3xl text-foreground" lang="ar" dir="rtl">
          {b.arabicName}
        </p>
        <p className="mt-3 text-muted-foreground">{b.description[lang]}</p>
        <p className="mt-4 text-xs text-muted-foreground uppercase tracking-widest">
          {b.compiler[lang]} · {b.eraCE}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("totalHadith", { count: pageData.total.toLocaleString() })}
        </p>
      </header>

      <nav
        aria-label="Pagination"
        className="mt-10 flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <div className="flex items-center gap-2">
          <PagerLink
            book={b.slug}
            locale={locale}
            page={prevPage}
            disabled={prevPage === null}
          >
            ← Prev
          </PagerLink>
          <PagerLink
            book={b.slug}
            locale={locale}
            page={nextPage}
            disabled={nextPage === null}
          >
            Next →
          </PagerLink>
        </div>
        <p className="text-muted-foreground">
          Page {clampedPage.toLocaleString()} / {totalPages.toLocaleString()}
          {" · "}
          Hadith {(startIndex + 1).toLocaleString()}–
          {(startIndex + pageData.hadiths.length).toLocaleString()} of{" "}
          {pageData.total.toLocaleString()}
        </p>
        <form
          method="GET"
          action={locale === "en" ? `/hadith/${b.slug}` : `/${locale}/hadith/${b.slug}`}
          className="flex items-center gap-2"
        >
          <label htmlFor="jump" className="text-muted-foreground">
            Jump to page
          </label>
          <input
            id="jump"
            name="page"
            type="number"
            min={1}
            max={totalPages}
            defaultValue={clampedPage}
            className="focus-ring w-20 rounded-lg border border-separator bg-surface px-2 py-1"
          />
          <button
            type="submit"
            className="focus-ring rounded-lg border border-separator bg-surface px-3 py-1 hover:bg-muted transition-colors"
          >
            Go
          </button>
        </form>
      </nav>

      <section aria-label="Hadiths on this page" className="mt-6">
        <HadithVirtualList
          hadiths={pageData.hadiths}
          lang={lang}
          bookLabel={b.name[lang]}
        />
      </section>

      <nav aria-label="Pagination (bottom)" className="mt-8 flex items-center justify-between text-sm">
        <PagerLink
          book={b.slug}
          locale={locale}
          page={prevPage}
          disabled={prevPage === null}
        >
          ← Prev
        </PagerLink>
        <p className="text-muted-foreground">
          Page {clampedPage.toLocaleString()} / {totalPages.toLocaleString()}
        </p>
        <PagerLink
          book={b.slug}
          locale={locale}
          page={nextPage}
          disabled={nextPage === null}
        >
          Next →
        </PagerLink>
      </nav>
    </article>
  );
}

// Anchor-based pager. Rebuilds the /hadith/[book]?page=N URL respecting locale.
function PagerLink({
  book,
  locale,
  page,
  disabled,
  children,
}: {
  book: string;
  locale: string;
  page: number | null;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const base = locale === "en" ? `/hadith/${book}` : `/${locale}/hadith/${book}`;
  const href = page ? `${base}?page=${page}` : base;
  if (disabled) {
    return (
      <span
        aria-disabled
        className="rounded-lg border border-separator bg-surface px-3 py-1 text-muted-foreground opacity-60"
      >
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="focus-ring rounded-lg border border-separator bg-surface px-3 py-1 hover:bg-muted transition-colors"
    >
      {children}
    </a>
  );
}
