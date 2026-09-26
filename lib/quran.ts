// Quran domain types and accessors. Data lives under data/quran/ — populated by
// scripts/fetch-quran.ts against Al-Quran Cloud on `pnpm fetch:quran`. This module
// is the ONLY place that touches those JSON files.

import surahsMeta from "@/data/quran/surahs.json";

export type Surah = {
  number: number; // 1–114
  name: string; // English display name, e.g. "Al-Fatihah"
  slug: string; // URL slug, e.g. "al-fatihah"
  arabicName: string; // e.g. "الفاتحة"
  englishTranslation: string; // e.g. "The Opening"
  revelation: "meccan" | "medinan";
  ayahCount: number;
  order: number; // Revelation order (per Al-Quran Cloud metadata)
};

export type Ayah = {
  surah: number;
  ayah: number;
  arabic: string; // Uthmani
  transliteration?: string;
  translations: Record<string, string>; // key = translation id (e.g. "en.sahih")
  juz: number;
  page: number;
  hizb: number;
  audio: Record<string, string>; // reciter id → audio URL
};

const surahs = surahsMeta as ReadonlyArray<Surah>;

export function getAllSurahs(): ReadonlyArray<Surah> {
  return surahs;
}

export function getSurahByNumber(n: number): Surah | undefined {
  return surahs.find((s) => s.number === n);
}

export function getSurahBySlug(slug: string): Surah | undefined {
  return surahs.find((s) => s.slug === slug);
}

export function totalAyahCount(): number {
  return surahs.reduce((a, s) => a + s.ayahCount, 0);
}

// Loads a full surah's ayat. Returns undefined if the surah hasn't been fetched yet.
// Uses dynamic import so unused surahs never enter the client bundle.
export async function loadSurahAyat(surahNumber: number): Promise<Ayah[] | undefined> {
  try {
    const mod = (await import(`@/data/quran/surahs/${surahNumber}.json`)) as { default: Ayah[] };
    return mod.default;
  } catch {
    return undefined;
  }
}

export async function loadAyah(surahNumber: number, ayahNumber: number): Promise<Ayah | undefined> {
  const ayat = await loadSurahAyat(surahNumber);
  return ayat?.find((a) => a.ayah === ayahNumber);
}

// The five "famous" starter surahs whose text ships in-repo even before fetch:quran runs,
// so the site is meaningful on first clone. Everything else prints a friendly stub.
export const SEEDED_SURAHS: readonly number[] = [1, 36, 55, 67, 112, 113, 114] as const;

export function isSeeded(n: number): boolean {
  return (SEEDED_SURAHS as readonly number[]).includes(n);
}

// Reciter registry (v1). URLs follow the Al-Quran Cloud / islamic.network CDN
// convention: https://cdn.islamic.network/quran/audio/{bitrate}/{reciter}/{globalAyah}.mp3
//
// Per-reciter bitrate: the CDN doesn't ship every reciter at 128 kbps. Abdul
// Basit's 128 folder returns 403 while 192 works; Alafasy is 128 only; etc.
// Verified 2026-09-26 via HEAD requests. If we ever want higher fidelity we
// pick per-reciter here rather than a global constant.
export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", short: "Alafasy", bitrate: 128 },
  {
    id: "ar.abdulbasitmurattal",
    name: "Abdul Basit (Murattal)",
    short: "Abdul Basit",
    bitrate: 192,
  },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", short: "Al-Husary", bitrate: 128 },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", short: "Al-Minshawi", bitrate: 128 },
  // NOTE: ar.sudais is 403 on ALL bitrates on islamic.network as of 2026-09-26.
  // Keeping the entry so bookmarks don't break, but the UI should mark it
  // unavailable. TODO: switch to everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/
  // or self-host if we want to keep offering Sudais.
  { id: "ar.sudais", name: "Abdurrahmaan As-Sudais", short: "As-Sudais", bitrate: 192 },
] as const;

export type ReciterId = (typeof RECITERS)[number]["id"];

// Global ayah index (1..6236) → used to build audio URLs deterministically.
// We compute lazily from surahs metadata to avoid a second table.
export function globalAyahNumber(surah: number, ayah: number): number {
  let total = 0;
  for (const s of surahs) {
    if (s.number === surah) return total + ayah;
    total += s.ayahCount;
  }
  return 0;
}

/** islamic.network audio CDN URL for a single ayah. Picks the reciter's
 *  known-good bitrate (see RECITERS table). */
export function audioUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const g = globalAyahNumber(surah, ayah);
  const meta = RECITERS.find((r) => r.id === reciter);
  const bitrate = meta?.bitrate ?? 128;
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${reciter}/${g}.mp3`;
}

// Translations registry — Al-Quran Cloud edition IDs.
export const TRANSLATIONS = [
  { id: "en.sahih", lang: "en", name: "Saheeh International" },
  { id: "en.pickthall", lang: "en", name: "Marmaduke Pickthall" },
  { id: "en.yusufali", lang: "en", name: "Yusuf Ali" },
  { id: "id.indonesian", lang: "id", name: "Kementerian Agama RI" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
