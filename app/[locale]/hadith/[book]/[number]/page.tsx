import { HadithAudioButton } from "@/components/hadith/audio-button";
import { ArticleSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getBook, loadHadith } from "@/lib/hadith";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

// Weekly ISR — one hadith per URL, generated on demand and cached at the edge.
// Building 34,259 × 6 locales at ship time is unnecessary; the backend is fast
// and the CDN handles the rest.
//
// IMPORTANT: DO NOT add generateStaticParams() with an empty [] here. Next
// 15 treats "empty generateStaticParams + dynamicParams=true" as "fully
// dynamic route" and emits Cache-Control: no-store — bypassing Cloudflare
// entirely. Without generateStaticParams the route defaults to ISR with
// the revalidate below, which emits s-maxage headers Cloudflare caches.
// Verified on /quran/al-fatihah/1 (which uses ISR without empty
// generateStaticParams) vs the previous /hadith/*/N (which shipped
// no-store).
export const revalidate = 604800;
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; book: string; number: string }> };

function isValidNumber(raw: string): boolean {
  // Accepts "1", "42", "402.2" — matches how the backend stores hadith numbers.
  return /^\d+(?:\.\d+)?$/.test(raw);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, book, number } = await params;
  const b = getBook(book);
  if (!b || !isValidNumber(number)) return {};
  const h = await loadHadith(b.slug, number);
  const lang = (locale === "id" ? "id" : "en") as "en" | "id";
  const desc = h?.translation?.[lang] ?? `Hadith ${number} from ${b.name.en}.`;
  return {
    title: `${b.name[lang]} · Hadith ${number}`,
    description: `${desc.slice(0, 155)}${desc.length > 155 ? "…" : ""}`,
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/hadith/${book}/${number}` : `/${locale}/hadith/${book}/${number}`,
      ),
      languages: hreflangLanguages(`/hadith/${book}/${number}`),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/hadith/${book}/${number}` : `/${locale}/hadith/${book}/${number}`,
      ),
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
        description={h.translation[lang] || h.translation.en}
        url={siteUrl(`/hadith/${b.slug}/${number}`)}
        datePublished="2026-09-19"
      />

      <Link
        href={`/hadith/${b.slug}` as "/hadith/[book]"}
        className="focus-ring text-sm text-accent hover:underline"
      >
        {t("backToBook", { name: b.name[lang] })}
      </Link>

      <header className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {b.name[lang]}
          </p>
          <h1 className="mt-1 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
            {t("hadithLabel", { number })}
          </h1>
        </div>
        {h.arabic ? (
          <HadithAudioButton arabic={h.arabic} size="md" />
        ) : null}
      </header>

      {h.arabic ? (
        <p
          lang="ar"
          dir="rtl"
          className="mt-8 font-quran text-3xl leading-[2.2] text-right"
        >
          {h.arabic}
        </p>
      ) : null}
      {(h.translation[lang] || h.translation.en) && (
        <p className="mt-6 text-lg leading-relaxed">
          {h.translation[lang] || h.translation.en}
        </p>
      )}

      <footer className="mt-8 pt-4 border-t border-separator text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          {t("source")}: {b.name[lang]} #{number}
        </span>
        {h.grade ? (
          <span>
            {t("grade")}: <span className="text-accent">{h.grade}</span>
          </span>
        ) : null}
        <span>{t("compiler")}: {b.compiler[lang]}</span>
      </footer>
    </article>
  );
}
