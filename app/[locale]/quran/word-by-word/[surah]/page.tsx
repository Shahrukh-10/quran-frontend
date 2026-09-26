// Demo route: /quran/word-by-word/[surah]
// Renders any surah using per-word interactive tokens (Quran.com's signature UX).
// Data source: data/quran/quran-com/verses/{surah}.json (populated by
// `pnpm sync:quran-com --only=verses`).
//
// If the local file doesn't exist yet, fall back to a live API call.

import { WordByWordAyah } from "@/components/quran/word-by-word-ayah";
import "@/components/quran/word-by-word-ayah.css";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { getAllSurahs, getSurahBySlug } from "@/lib/quran";
import { versesByChapter } from "@/lib/quran-api";
import { siteUrl } from "@/lib/site";
import { breadcrumbs } from "@/lib/breadcrumbs";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hreflangLanguages } from "@/lib/seo";

export async function generateStaticParams() {
  const surahs = getAllSurahs();
  const params: Array<{ locale: string; surah: string }> = [];
  for (const locale of locales) {
    // All 114 surahs — full local data is available in quran-data/verses/*.json.
    for (const s of surahs) {
      params.push({ locale, surah: s.slug });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; surah: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, surah } = await params;
  const bc = await breadcrumbs(locale);
  const s = getSurahBySlug(surah);
  if (!s) return {};
  return {
    title: `${s.name} — Word by word · Surah ${s.number}`,
    description: `Study Surah ${s.name} word by word — Arabic, transliteration, English meaning, and per-word audio pronunciation for every one of the ${s.ayahCount} ayahs.`,
    alternates: {
      canonical: siteUrl(
        locale === "en" ? `/quran/word-by-word/${surah}` : `/${locale}/quran/word-by-word/${surah}`,
      ),
      languages: hreflangLanguages(`/quran/word-by-word/${surah}`),
    },
    openGraph: {
      url: siteUrl(
        locale === "en" ? `/quran/word-by-word/${surah}` : `/${locale}/quran/word-by-word/${surah}`,
      ),
    },
  };
}

async function loadVersesLocal(
  surahNumber: number,
): Promise<Array<{ verse_key: string; verse_number: number; words: unknown[] }> | null> {
  try {
    const mod = await import(`@/quran-data/verses/${surahNumber}.json`);
    return mod.default as Array<{ verse_key: string; verse_number: number; words: unknown[] }>;
  } catch {
    return null;
  }
}

export default async function WordByWordSurahPage({ params }: Props) {
  const { locale, surah } = await params;
  const bc = await breadcrumbs(locale);
  setRequestLocale(locale);
  const s = getSurahBySlug(surah);
  if (!s) notFound();

  // Try local data first; fall back to live API.
  let verses = await loadVersesLocal(s.number);
  let source: "local" | "live" = "local";
  if (!verses) {
    try {
      const res = await versesByChapter(s.number, {
        words: true,
        wordFields: [
          "text_uthmani",
          "text_indopak",
          "translation",
          "transliteration",
          "audio_url",
          "location",
        ],
        fields: ["text_uthmani", "text_indopak", "page_number", "juz_number"],
      });
      verses = res.verses as unknown as Array<{
        verse_key: string;
        verse_number: number;
        words: unknown[];
      }>;
      source = "live";
    } catch (err) {
      // Show a friendly stub instead of a crash.
      verses = null;
    }
  }

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: bc("wordByWord"), url: siteUrl("/quran/word-by-word") },
          { name: s.name, url: siteUrl(`/quran/word-by-word/${s.slug}`) },
        ]}
      />

      <header className="text-center">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          Word-by-word study · Surah {s.number}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold tracking-display">{s.name}</h1>
        <p className="mt-1 text-muted-foreground">{s.englishTranslation}</p>
        <p className="mt-6 font-quran text-5xl md:text-6xl text-foreground" lang="ar" dir="rtl">
          {s.arabicName}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {s.ayahCount} ayat · {s.revelation === "meccan" ? "Meccan" : "Medinan"}
          {" · "}
          <span className="text-xs opacity-70">
            Tap any Arabic word for meaning &amp; audio · Data:{" "}
            {source === "local" ? "cached" : "live"}
          </span>
        </p>
        <p className="mt-4">
          <Link
            href={`/quran/${s.slug}`}
            className="text-sm text-accent hover:underline focus-ring"
          >
            ← Back to full-verse view
          </Link>
        </p>
      </header>

      {s.number !== 1 && s.number !== 9 && (
        <p
          className="mt-10 text-center font-quran text-4xl md:text-5xl text-foreground/85"
          lang="ar"
          dir="rtl"
          style={{ lineHeight: 2 }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </p>
      )}

      {verses ? (
        <ol className="mt-10 space-y-8">
          {verses.map((v) => (
            <li
              key={v.verse_key}
              id={`ayah-${v.verse_number}`}
              className="rounded-2xl border border-separator bg-surface/60 p-4 sm:p-6"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center rounded-lg bg-accent-muted px-2 py-1 text-xs font-medium text-accent">
                  {v.verse_key}
                </span>
              </div>
              <WordByWordAyah
                verseKey={v.verse_key}
                words={v.words as Parameters<typeof WordByWordAyah>[0]["words"]}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-10 rounded-2xl border border-separator bg-surface p-6">
          <p className="text-sm">
            Word-by-word data for this surah isn&apos;t downloaded yet. Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              pnpm sync:quran-com --only=verses
            </code>{" "}
            to fetch all 114 surahs (~5 minutes, one-time).
          </p>
        </div>
      )}
    </article>
  );
}
