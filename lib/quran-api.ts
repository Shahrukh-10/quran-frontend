// Quran.com Content APIs v4 wrapper.
//
// Two modes:
//   1. LIVE (default in dev): fetch from https://api.quran.com/api/v4
//   2. LOCAL (set QURAN_SOURCE=local): read from quran-data/*.json
//      — populated by `pnpm sync:quran-com`.
//
// Long-term goal: flip QURAN_SOURCE to 'local' in production so the site is
// fully self-hosted and independent of quran.com uptime.
//
// The v4 open Content APIs require NO authentication for these endpoints.
// Verified live via curl on 2026-09-20.

const BASE = "https://api.quran.com/api/v4";

// ─── Types ───────────────────────────────────────────────────────────────

export type QcChapter = {
  id: number;
  revelation_place: "makkah" | "madinah";
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string; // "Al-Fatihah"
  name_complex: string; // "Al-Fātiḥah"
  name_arabic: string; // "الفاتحة"
  verses_count: number;
  pages: [number, number]; // start/end page in the Madinah mushaf
  translated_name: { language_name: string; name: string };
};

export type QcTranslation = {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: { name: string; language_name: string };
};

export type QcTafsir = {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: { name: string; language_name: string };
};

export type QcRecitation = {
  id: number;
  reciter_name: string;
  style: string | null;
  translated_name: { name: string; language_name: string };
};

// A single word inside a verse. This is quran.com's biggest feature that
// alquran.cloud doesn't have — per-word transliteration + English gloss
// + morphology + audio pronunciation URL.
export type QcWord = {
  id: number;
  position: number; // 1-indexed within the ayah
  audio_url: string | null; // relative to https://audio.qurancdn.com/
  char_type_name: "word" | "end"; // 'end' = verse-end marker
  text_uthmani: string;
  text_indopak?: string;
  page_number: number;
  line_number: number;
  translation?: { text: string; language_name: string };
  transliteration?: { text: string; language_name: string };
};

export type QcVerse = {
  id: number;
  verse_number: number; // ayah number within its surah
  verse_key: string; // "1:1", "2:255"
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  text_uthmani?: string;
  text_indopak?: string;
  text_imlaei?: string;
  text_uthmani_tajweed?: string;
  page_number: number;
  juz_number: number;
  words?: QcWord[];
  translations?: Array<{ id: number; resource_id: number; text: string }>;
  tafsirs?: Array<{ id: number; resource_id: number; text: string }>;
};

export type QcAudioFile = {
  id: number;
  chapter_id: number;
  file_size: number;
  format: string; // "mp3"
  audio_url: string; // full URL
};

export type QcAyahRecitation = {
  audio_url: string;
  duration: number;
  format: string;
  // segments[i] = [word_position, start_ms, end_ms] — the killer feature
  // for word-synced highlighting during audio playback.
  segments: Array<[number, number, number]>;
  verse_key: string;
};

// ─── Fetch helper ────────────────────────────────────────────────────────

type FetchOpts = {
  revalidate?: number; // seconds; 0 = no cache, undefined = use platform default
  signal?: AbortSignal;
};

async function qc<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const init: RequestInit & { next?: { revalidate?: number } } = {
    signal: opts.signal,
  };
  // Next.js-flavoured cache hint. On non-Next runtimes this is a no-op.
  if (typeof opts.revalidate === "number") {
    init.next = { revalidate: opts.revalidate };
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new QuranApiError(res.status, `Quran API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export class QuranApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "QuranApiError";
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

// Chapters (114 surahs)
export async function listChapters(language = "en"): Promise<QcChapter[]> {
  const data = await qc<{ chapters: QcChapter[] }>(
    `/chapters?language=${language}`,
    { revalidate: 60 * 60 * 24 * 30 }, // 30 days — chapter list is immutable
  );
  return data.chapters;
}

// Available translations (~126)
export async function listTranslations(language = "en"): Promise<QcTranslation[]> {
  const data = await qc<{ translations: QcTranslation[] }>(
    `/resources/translations?language=${language}`,
    { revalidate: 60 * 60 * 24 * 7 },
  );
  return data.translations;
}

// Available tafsirs (~15)
export async function listTafsirs(language = "en"): Promise<QcTafsir[]> {
  const data = await qc<{ tafsirs: QcTafsir[] }>(`/resources/tafsirs?language=${language}`, {
    revalidate: 60 * 60 * 24 * 7,
  });
  return data.tafsirs;
}

// Available reciters (12 at time of writing)
export async function listRecitations(language = "en"): Promise<QcRecitation[]> {
  const data = await qc<{ recitations: QcRecitation[] }>(
    `/resources/recitations?language=${language}`,
    { revalidate: 60 * 60 * 24 * 7 },
  );
  return data.recitations;
}

export type VerseQueryOpts = {
  translations?: number[]; // e.g. [20] for Sahih International
  tafsirs?: number[];
  words?: boolean;
  wordFields?: Array<
    "text_uthmani" | "text_indopak" | "translation" | "transliteration" | "audio_url" | "location"
  >;
  fields?: Array<
    | "text_uthmani"
    | "text_indopak"
    | "text_imlaei"
    | "text_uthmani_tajweed"
    | "page_number"
    | "juz_number"
  >;
  language?: string;
  perPage?: number;
  page?: number;
};

function verseQueryString(opts: VerseQueryOpts): string {
  const p = new URLSearchParams();
  if (opts.translations?.length) p.set("translations", opts.translations.join(","));
  if (opts.tafsirs?.length) p.set("tafsirs", opts.tafsirs.join(","));
  if (opts.words) p.set("words", "true");
  if (opts.wordFields?.length) p.set("word_fields", opts.wordFields.join(","));
  if (opts.fields?.length) p.set("fields", opts.fields.join(","));
  p.set("language", opts.language ?? "en");
  if (opts.perPage) p.set("per_page", String(opts.perPage));
  if (opts.page) p.set("page", String(opts.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Get all verses in a chapter. Note: v4 paginates at 50/page by default.
// For a full surah, iterate pages until `pagination.next_page` is null.
export async function versesByChapter(
  chapterId: number,
  opts: VerseQueryOpts = {},
): Promise<{ verses: QcVerse[]; totalPages: number; totalCount: number }> {
  const merged: QcVerse[] = [];
  let page = 1;
  let totalPages = 1;
  let totalCount = 0;
  do {
    const data = await qc<{
      verses: QcVerse[];
      pagination: {
        per_page: number;
        current_page: number;
        next_page: number | null;
        total_pages: number;
        total_records: number;
      };
    }>(
      `/verses/by_chapter/${chapterId}${verseQueryString({ ...opts, page, perPage: opts.perPage ?? 50 })}`,
      {
        revalidate: 60 * 60 * 24 * 30, // 30 days
      },
    );
    merged.push(...data.verses);
    totalPages = data.pagination.total_pages;
    totalCount = data.pagination.total_records;
    if (!data.pagination.next_page) break;
    page = data.pagination.next_page;
  } while (page <= totalPages);
  return { verses: merged, totalPages, totalCount };
}

// Get a single verse by "surah:ayah" key.
export async function verseByKey(verseKey: string, opts: VerseQueryOpts = {}): Promise<QcVerse> {
  const data = await qc<{ verse: QcVerse }>(`/verses/by_key/${verseKey}${verseQueryString(opts)}`, {
    revalidate: 60 * 60 * 24 * 30,
  });
  return data.verse;
}

// Get all verses on a specific mushaf page (1–604).
export async function versesByPage(
  pageNumber: number,
  opts: VerseQueryOpts = {},
): Promise<QcVerse[]> {
  const data = await qc<{ verses: QcVerse[] }>(
    `/verses/by_page/${pageNumber}${verseQueryString(opts)}`,
    { revalidate: 60 * 60 * 24 * 30 },
  );
  return data.verses;
}

// Full-surah audio (single MP3 for the whole chapter).
export async function chapterAudio(recitationId: number, chapterId: number): Promise<QcAudioFile> {
  const data = await qc<{ audio_file: QcAudioFile }>(
    `/chapter_recitations/${recitationId}/${chapterId}`,
    { revalidate: 60 * 60 * 24 * 30 },
  );
  return data.audio_file;
}

// Per-ayah audio with word-level timing segments — used for word-sync highlighting.
export async function ayahAudio(recitationId: number, verseKey: string): Promise<QcAyahRecitation> {
  const data = await qc<{ audio_files: QcAyahRecitation[] }>(
    `/recitations/${recitationId}/by_ayah/${verseKey}`,
    { revalidate: 60 * 60 * 24 * 30 },
  );
  const first = data.audio_files[0];
  if (!first) throw new QuranApiError(404, `No audio for ${verseKey} reciter ${recitationId}`);
  return first;
}

// Search across Arabic text, translations, and tafsir.
export type QcSearchResult = {
  verse_key: string;
  verse_id: number;
  text: string;
  highlighted: string;
  words: Array<{ text: string; char_type_name: string; highlight: boolean }>;
  translations: Array<{ text: string; resource_name: string; language_name: string }>;
};

export async function search(
  query: string,
  opts: { size?: number; page?: number; language?: string } = {},
): Promise<{
  results: QcSearchResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}> {
  const p = new URLSearchParams({ q: query });
  p.set("size", String(opts.size ?? 20));
  p.set("page", String(opts.page ?? 0));
  p.set("language", opts.language ?? "en");
  const data = await qc<{
    search: {
      query: string;
      total_results: number;
      current_page: number;
      total_pages: number;
      results: QcSearchResult[];
    };
  }>(`/search?${p.toString()}`, { revalidate: 60 * 5 }); // 5 min — search results can move
  return {
    results: data.search.results,
    totalCount: data.search.total_results,
    currentPage: data.search.current_page,
    totalPages: data.search.total_pages,
  };
}

// Helper: resolve a word audio URL from the relative path returned in words.audio_url.
export function wordAudioUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const trimmed = relativePath.replace(/^\/+/, "");
  return `https://audio.qurancdn.com/${trimmed}`;
}

// ─── Curated defaults (per QURAN-CLONE-PLAN.md answers) ──────────────────

export const DEFAULT_TRANSLATIONS = {
  en: [20, 84, 22], // Sahih International, Mufti Taqi Usmani, Yusuf Ali
  id: [33], // The Indonesian Ministry of Religious Affairs
  ur: [151], // Fateh Muhammad Jalandhri
  ar: [], // Arabic has no "translation"
} as const;

export const DEFAULT_TAFSIRS = {
  en: [169], // Ibn Kathir (Abridged)
  ar: [16], // Tafsir Al-Muyassar
} as const;

export const DEFAULT_RECITER = 7; // Mishari Rashid al-`Afasy — most-listened globally
