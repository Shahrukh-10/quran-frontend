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

// Reciter registry (v1). URLs follow the EveryAyah / Al-Quran Cloud convention:
// https://cdn.islamic.network/quran/audio/128/{reciter}/{globalAyah}.mp3
export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Rashid Alafasy", short: "Alafasy" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit (Murattal)", short: "Abdul Basit" },
  { id: "ar.husary", name: "Mahmoud Khalil Al-Husary", short: "Al-Husary" },
  { id: "ar.minshawi", name: "Mohamed Siddiq Al-Minshawi", short: "Al-Minshawi" },
  { id: "ar.sudais", name: "Abdurrahmaan As-Sudais", short: "As-Sudais" },
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

export function audioUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const g = globalAyahNumber(surah, ayah);
  return `https://cdn.islamic.network/quran/audio/128/${reciter}/${g}.mp3`;
}

// Translations registry — Al-Quran Cloud edition IDs.
export const TRANSLATIONS = [
  { id: "en.sahih", lang: "en", name: "Saheeh International" },
  { id: "en.pickthall", lang: "en", name: "Marmaduke Pickthall" },
  { id: "en.yusufali", lang: "en", name: "Yusuf Ali" },
  { id: "id.indonesian", lang: "id", name: "Kementerian Agama RI" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];
