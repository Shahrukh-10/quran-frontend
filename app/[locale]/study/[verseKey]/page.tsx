// Study Mode — deep-dive on a single ayah.
// Server-rendered. Tabs are anchor-linked via ?tab= so SSR works without JS.
// URL uses "s-a" (dash) instead of "s:a" because ":" is reserved in URL path segments.

import { NoteEditor } from "@/components/quran/note-editor";
import { WordByWordAyah } from "@/components/quran/word-by-word-ayah";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { locales } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { breadcrumbs } from "@/lib/breadcrumbs";
import { getSurahByNumber, loadAyah } from "@/lib/quran";
import { getAyahRef, getAyahRefByKey } from "@/lib/quran-index";
import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

// Statically prebuild the 20 most-referenced ayat across both locales.
// Everything else falls to ISR / on-demand.
const FAMOUS_KEYS = [
  "1:1",
  "1:2",
  "1:3",
  "1:4",
  "1:5",
  "1:6",
  "1:7",
  "2:255",
  "24:35",
  "36:1",
  "36:2",
  "55:13",
  "112:1",
  "112:2",
  "112:3",
  "112:4",
  "113:1",
  "114:1",
  "3:8",
  "94:5",
] as const;

export const dynamicParams = true;

export async function generateStaticParams() {
  const params: Array<{ locale: string; verseKey: string }> = [];
  for (const locale of locales) {
    for (const key of FAMOUS_KEYS) {
      params.push({ locale, verseKey: key.replace(":", "-") });
    }
  }
  return params;
}

type Props = { params: Promise<{ locale: string; verseKey: string }> };

type Word = {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: "word" | "end";
  text_uthmani: string;
  text_indopak?: string;
  location: string;
  translation?: { text: string; language_name: string };
  transliteration?: { text: string; language_name: string };
};

type TafsirRow = { verse_key: string; text: string };
type VerseRow = { verse_key: string; verse_number: number; words: Word[] };

function parseVerseKey(raw: string): { surah: number; ayah: number; key: string } | null {
  const [sRaw, aRaw] = raw.split("-");
  if (!sRaw || !aRaw) return null;
  const s = Number.parseInt(sRaw, 10);
  const a = Number.parseInt(aRaw, 10);
  if (!Number.isInteger(s) || !Number.isInteger(a) || s < 1 || a < 1) return null;
  return { surah: s, ayah: a, key: `${s}:${a}` };
}

async function loadWords(surah: number, ayah: number): Promise<Word[] | null> {
  try {
    const mod = (await import(`@/quran-data/verses/${surah}.json`)) as { default: VerseRow[] };
    const row = mod.default.find((v) => v.verse_number === ayah);
    return row?.words ?? null;
  } catch {
    return null;
  }
}

async function loadTafsir(surah: number, verseKey: string): Promise<string | null> {
  try {
    const mod = (await import(`@/quran-data/tafsirs/169/${surah}.json`)) as {
      default: TafsirRow[];
    };
    const row = mod.default.find((r) => r.verse_key === verseKey);
    return row?.text ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, verseKey } = await params;
  const bc = await breadcrumbs(locale);
  const parsed = parseVerseKey(verseKey);
  if (!parsed) return {};
  const surah = getSurahByNumber(parsed.surah);
  if (!surah || parsed.ayah > surah.ayahCount) return {};
  const ayah = await loadAyah(parsed.surah, parsed.ayah);
  const raw = ayah?.translations["en.sahih"] ?? `Ayah ${parsed.key} of Surah ${surah.name}.`;
  const desc = raw.length > 155 ? `${raw.slice(0, 154)}…` : raw;
  const title =
    parsed.key === "2:255"
      ? "Ayat al-Kursi · Study Mode"
      : `Surah ${surah.name} ${parsed.key} · Study Mode`;
  const path = `/study/${verseKey}`;
  return {
    title,
    description: desc,
    alternates: {
      canonical: siteUrl(locale === "en" ? path : `/${locale}${path}`),
      languages: Object.fromEntries(
        locales.map((l) => [l, siteUrl(l === "en" ? path : `/${l}${path}`)]),
      ),
    },
    openGraph: {
      url: siteUrl(locale === "en" ? path : `/${locale}${path}`),
    },
  };
}

const TABS = ["translations", "tafsir", "notes", "related"] as const;
type Tab = (typeof TABS)[number];

type SearchProps = {
  params: Promise<{ locale: string; verseKey: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function StudyAyahPage({ params, searchParams }: SearchProps) {
  const { locale, verseKey } = await params;
  const bc = await breadcrumbs(locale);
  const { tab: rawTab } = await searchParams;
  setRequestLocale(locale);

  const parsed = parseVerseKey(verseKey);
  if (!parsed) notFound();
  const surah = getSurahByNumber(parsed.surah);
  if (!surah || parsed.ayah > surah.ayahCount) notFound();

  const ayah = await loadAyah(parsed.surah, parsed.ayah);
  if (!ayah) notFound();

  const ref = await getAyahRefByKey(parsed.key);
  const words = await loadWords(parsed.surah, parsed.ayah);
  const tafsirHtml = await loadTafsir(parsed.surah, parsed.key);

  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as Tab)
    : "translations";

  // Prev / next ayah computation. Falls off at 1:1 and 114:last.
  const prevRef =
    parsed.ayah > 1
      ? await getAyahRef(parsed.surah, parsed.ayah - 1)
      : parsed.surah > 1
        ? (async () => {
            const prevSurah = getSurahByNumber(parsed.surah - 1);
            return prevSurah ? await getAyahRef(prevSurah.number, prevSurah.ayahCount) : undefined;
          })()
        : undefined;
  const resolvedPrev = prevRef instanceof Promise ? await prevRef : prevRef;

  const nextRef =
    parsed.ayah < surah.ayahCount
      ? await getAyahRef(parsed.surah, parsed.ayah + 1)
      : parsed.surah < 114
        ? await getAyahRef(parsed.surah + 1, 1)
        : undefined;

  const displayTitle =
    parsed.key === "2:255" ? "Ayat al-Kursi" : `Surah ${surah.name} · ${parsed.key}`;

  const sahih = ayah.translations["en.sahih"] ?? "";
  const yusuf = ayah.translations["en.yusufali"] ?? "";
  const pickthall = ayah.translations["en.pickthall"] ?? "";

  const juz = ref?.juz ?? ayah.juz;
  const page = ref?.page ?? ayah.page;

  const basePath = `/study/${verseKey}`;
  const localePrefix = locale === "en" ? "" : `/${locale}`;

  return (
    <article className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <BreadcrumbSchema
        items={[
          { name: bc("home"), url: siteUrl("/") },
          { name: bc("quran"), url: siteUrl("/quran") },
          { name: surah.name, url: siteUrl(`/quran/${surah.slug}`) },
          { name: "Study Mode", url: siteUrl(basePath) },
        ]}
      />

      <header className="border-b border-border pb-6">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/quran" className="hover:underline">
                Quran
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={`/quran/${surah.slug}`} className="hover:underline">
                {surah.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Study Mode</li>
          </ol>
        </nav>
        <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">
          Study Mode · Ayah {parsed.key}
        </p>
        <h1 className="mt-1 text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-title">
          {displayTitle}
        </h1>
      </header>

      {/* Arabic */}
      <section className="mt-8" aria-label="Arabic text">
        <p
          className="font-quran text-right leading-loose text-[clamp(2rem,5vw,3rem)]"
          dir="rtl"
          lang="ar"
        >
          {cleanArabicForDisplay(ayah.arabic)}
        </p>
        {ayah.transliteration ? (
          <p className="mt-3 text-sm italic text-muted-foreground">{ayah.transliteration}</p>
        ) : null}
      </section>

      {/* Word-by-word grid */}
      {words && words.length > 0 ? (
        <section className="mt-10" aria-labelledby="wbw-heading">
          <h2
            id="wbw-heading"
            className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Word by word
          </h2>
          <div className="mt-3">
            <WordByWordAyah verseKey={parsed.key} words={words} />
          </div>
        </section>
      ) : null}

      {/* Tabs (anchor-linked via ?tab=) */}
      <nav
        className="mt-10 flex flex-wrap gap-1 border-b border-border"
        aria-label="Study tabs"
        role="tablist"
      >
        {TABS.map((t) => {
          const active = tab === t;
          const label =
            t === "translations"
              ? "Translations"
              : t === "tafsir"
                ? "Tafsir"
                : t === "notes"
                  ? "Notes"
                  : "Related";
          const href = t === "translations" ? basePath : `${basePath}?tab=${t}`;
          return (
            <Link
              key={t}
              href={href}
              role="tab"
              aria-selected={active}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {tab === "translations" ? (
        <section className="mt-6 grid gap-6 md:grid-cols-3" aria-labelledby="translations-heading">
          <h2 id="translations-heading" className="sr-only">
            English translations
          </h2>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Saheeh International
            </p>
            <p className="mt-2 text-base leading-relaxed">{sahih}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Yusuf Ali
            </p>
            <p className="mt-2 text-base leading-relaxed">{yusuf}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pickthall
            </p>
            <p className="mt-2 text-base leading-relaxed">{pickthall}</p>
          </div>
        </section>
      ) : null}

      {tab === "tafsir" ? (
        <section className="mt-6" aria-labelledby="tafsir-heading">
          <h2 id="tafsir-heading" className="text-lg font-semibold">
            Tafsir Ibn Kathir
          </h2>
          {tafsirHtml ? (
            <div
              className="tafsir-prose mt-4 max-w-none text-base leading-relaxed [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mt-3"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Server-side static HTML from vetted Ibn Kathir tafsir bundle (quran.com CDN mirror).
              dangerouslySetInnerHTML={{ __html: tafsirHtml }}
            />
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Tafsir for this ayah is not available in the local bundle.
            </p>
          )}
          <p className="mt-6 border-t border-border pt-3 text-xs text-muted-foreground">
            Tafsir Ibn Kathir (Abridged) — via quran.com
          </p>
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="mt-6" aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="text-lg font-semibold">
            Your notes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Private to this device. Stored in your browser only — never sent anywhere.
          </p>
          <NoteEditor verseKey={parsed.key} />
        </section>
      ) : null}

      {tab === "related" ? (
        <section className="mt-6" aria-labelledby="related-heading">
          <h2 id="related-heading" className="text-lg font-semibold">
            Related verses
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Related verses coming in Slice B backend.
          </p>
        </section>
      ) : null}

      {/* Actions row */}
      <section
        className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6 text-sm"
        aria-label="Ayah context links"
      >
        <Link
          href={`/quran/${surah.slug}`}
          className="rounded-md border border-border px-3 py-2 hover:bg-muted"
        >
          ← Read full Surah {surah.name}
        </Link>
        <Link
          href={`/quran/juz/${juz}`}
          className="rounded-md border border-border px-3 py-2 hover:bg-muted"
        >
          Juz {juz}
        </Link>
        <Link
          href={`/quran/page/${page}`}
          className="rounded-md border border-border px-3 py-2 hover:bg-muted"
        >
          Page {page}
        </Link>
      </section>

      {/* Prev / next */}
      <nav
        className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6"
        aria-label="Ayah navigation"
      >
        {resolvedPrev ? (
          <a
            href={`${localePrefix}/study/${resolvedPrev.s}-${resolvedPrev.a}`}
            className="focus-ring group flex-1 rounded-md border border-border px-4 py-3 hover:bg-muted"
          >
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="mt-1 block text-sm font-medium">← Ayah {resolvedPrev.key}</span>
          </a>
        ) : (
          <span className="flex-1" />
        )}
        {nextRef ? (
          <a
            href={`${localePrefix}/study/${nextRef.s}-${nextRef.a}`}
            className="focus-ring group flex-1 rounded-md border border-border px-4 py-3 text-right hover:bg-muted"
          >
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="mt-1 block text-sm font-medium">Ayah {nextRef.key} →</span>
          </a>
        ) : (
          <span className="flex-1" />
        )}
      </nav>
    </article>
  );
}
