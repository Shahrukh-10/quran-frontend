import { AyahCard } from "@/components/quran/ayah-card";
import { SurahHeaderBar } from "@/components/quran/surah-header-bar";
import { SurahReaderControls } from "@/components/quran/surah-reader-controls";
import {
  ArticleSchema,
  BreadcrumbSchema,
  QuranChapterSchema,
} from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getAllSurahs, getSurahBySlug, isSeeded, loadSurahAyat } from "@/lib/quran";
import { hreflangLanguages, mergedOgImages } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const surahs = getAllSurahs();
  const params: Array<{ locale: string; surah: string }> = [];
  for (const locale of locales) {
    for (const s of surahs) {
      params.push({ locale, surah: s.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; surah: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah } = await params;
  const s = getSurahBySlug(surah);
  if (!s) return {};
  return {
    title: `${s.name} · Surah ${s.number}`,
    description: `Read Surah ${s.name} (${s.englishTranslation}) — ${s.ayahCount} ayat, ${s.revelation}. Arabic, translation, transliteration, and verse audio.`,
    alternates: {
      canonical: siteUrl(locale === "en" ? `/quran/${surah}` : `/${locale}/quran/${surah}`),
      languages: hreflangLanguages(`/quran/${surah}`),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? `/quran/${surah}` : `/${locale}/quran/${surah}`),
      type: "article",
      locale,
      images: mergedOgImages(`Surah ${s.name} (${s.englishTranslation})`),
    },
  };
}

export default async function SurahPage({ params }: Props) {
  const { locale, surah } = await params;
  setRequestLocale(locale);
  const s = getSurahBySlug(surah);
  if (!s) notFound();

  const t = await getTranslations({ locale, namespace: "quran.surah" });
  const bc = await breadcrumbs(locale);
  const ayat = await loadSurahAyat(s.number);
  const isFullyAvailable = Boolean(ayat && ayat.length > 0);

  const prev = getAllSurahs().find((x) => x.number === s.number - 1);
  const next = getAllSurahs().find((x) => x.number === s.number + 1);

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: s.name, url: siteUrl(`/quran/${s.slug}`) },
        ]}
      />
      <ArticleSchema
        headline={`Surah ${s.name} (${s.englishTranslation})`}
        description={`The full text of Surah ${s.name}, ${s.ayahCount} ayat, revealed in ${s.revelation === "meccan" ? "Makkah" : "Madinah"}.`}
        url={siteUrl(`/quran/${s.slug}`)}
      />
      <QuranChapterSchema
        surahName={s.name}
        surahNumber={s.number}
        ayahCount={s.ayahCount}
        revelation={s.revelation}
        url={siteUrl(`/quran/${s.slug}`)}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          {t("surahLabel", { number: s.number })}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">{s.name}</h1>
        <p className="mt-1 text-muted-foreground">{s.englishTranslation}</p>
        <p className="mt-6 font-quran text-4xl text-foreground" lang="ar" dir="rtl">
          {s.arabicName}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {s.ayahCount} {t("ayat")} · {t(s.revelation)} · {t("juz")} {ayat?.[0]?.juz ?? "—"}
        </p>
      </header>

      {s.number !== 1 && s.number !== 9 && (
        <p className="mt-10 text-center font-quran text-3xl text-foreground/85" lang="ar" dir="rtl">
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
      )}

      <SurahHeaderBar surah={s.number} surahSlug={s.slug} ayahCount={s.ayahCount} />

      <SurahReaderControls surah={s.number} />

      {isFullyAvailable ? (
        <ol className="mt-8 space-y-6">
          {ayat?.map((a) => (
            <li key={a.ayah}>
              <AyahCard ayah={a} surahSlug={s.slug} surahName={s.name} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-10 rounded-2xl border border-separator bg-surface p-6">
          <p className="text-sm text-muted-foreground">{t("stubIntro", { name: s.name })}</p>
          <p className="mt-3 text-sm">
            {t("stubHow")} <code className="rounded bg-muted px-1.5 py-0.5">pnpm fetch:quran</code>{" "}
            {t("stubTail")}
          </p>
          {isSeeded(s.number) === false && (
            <p className="mt-3 text-xs text-muted-foreground">{t("stubSeed")}</p>
          )}
        </div>
      )}

      <nav
        aria-label="Surah navigation"
        className="mt-16 grid grid-cols-2 gap-4 border-t border-separator pt-8"
      >
        <div>
          {prev && (
            <Link
              href={`/quran/${prev.slug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("previous")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                {prev.number}. {prev.name}
              </span>
            </Link>
          )}
        </div>
        <div className="text-right">
          {next && (
            <Link
              href={`/quran/${next.slug}`}
              className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
            >
              <span className="block text-xs text-muted-foreground">{t("next")}</span>
              <span className="mt-1 block font-semibold tracking-title truncate">
                {next.number}. {next.name}
              </span>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}
