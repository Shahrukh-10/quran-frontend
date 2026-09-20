// Hadith collections metadata. Six canonical Sunni collections — the Kutub as-Sittah
// (The Six Books). Section names are pulled from Fawaz Ahmed's public hadith
// dataset (fawazahmed0/hadith-api) and edited for consistency.
//
// The actual hadith text lives in the Spring Boot backend (qh_book / qh_hadith).
// This module exposes typed fetch helpers that hit /api/qb/hadith/* through the
// Next.js rewrite (see next.config.ts). Server components go direct to the
// backend via BACKEND_URL; the browser goes through /api/qb/*.
export type HadithBook = {
  slug: string;
  name: { en: string; id: string };
  arabicName: string;
  compiler: { en: string; id: string };
  compilerArabic: string;
  totalHadith: number;
  eraCE: string;
  description: { en: string; id: string };
  /** Slug used by fawazahmed0/hadith-api CDN — `eng-<slug>`, `ara-<slug>`, `ind-<slug>`. */
  apiSlug: string;
};

export const HADITH_BOOKS: readonly HadithBook[] = [
  {
    slug: "bukhari",
    apiSlug: "bukhari",
    name: { en: "Sahih al-Bukhari", id: "Sahih al-Bukhari" },
    arabicName: "صحيح البخاري",
    compiler: { en: "Imam Muhammad al-Bukhari", id: "Imam Muhammad al-Bukhari" },
    compilerArabic: "محمد بن إسماعيل البخاري",
    totalHadith: 7589,
    eraCE: "846 CE / 232 AH",
    description: {
      en: "The most authentic collection of hadith after the Quran itself. Compiled over 16 years from ~600,000 narrations.",
      id: "Kumpulan hadis paling sahih setelah Al-Qur'an. Disusun selama 16 tahun dari sekitar 600.000 riwayat.",
    },
  },
  {
    slug: "muslim",
    apiSlug: "muslim",
    name: { en: "Sahih Muslim", id: "Sahih Muslim" },
    arabicName: "صحيح مسلم",
    compiler: { en: "Imam Muslim ibn al-Hajjaj", id: "Imam Muslim ibn al-Hajjaj" },
    compilerArabic: "مسلم بن الحجاج",
    totalHadith: 7563,
    eraCE: "875 CE / 261 AH",
    description: {
      en: "The second most authentic collection of hadith. Known for its rigorous chain-of-narrator methodology.",
      id: "Kumpulan hadis paling sahih kedua. Dikenal karena metodologi rantai perawi yang ketat.",
    },
  },
  {
    slug: "abudawud",
    apiSlug: "abudawud",
    name: { en: "Sunan Abu Dawud", id: "Sunan Abu Dawud" },
    arabicName: "سنن أبي داود",
    compiler: { en: "Imam Abu Dawud as-Sijistani", id: "Imam Abu Dawud as-Sijistani" },
    compilerArabic: "أبو داود السجستاني",
    totalHadith: 5274,
    eraCE: "888 CE / 275 AH",
    description: {
      en: "Focused on legal (fiqh) hadiths. Abu Dawud selected from ~500,000 narrations.",
      id: "Fokus pada hadis-hadis hukum (fiqih). Abu Dawud memilih dari sekitar 500.000 riwayat.",
    },
  },
  {
    slug: "tirmidhi",
    apiSlug: "tirmidhi",
    name: { en: "Jami' at-Tirmidhi", id: "Jami' at-Tirmidhi" },
    arabicName: "جامع الترمذي",
    compiler: { en: "Imam Abu Isa at-Tirmidhi", id: "Imam Abu Isa at-Tirmidhi" },
    compilerArabic: "أبو عيسى الترمذي",
    totalHadith: 3956,
    eraCE: "892 CE / 279 AH",
    description: {
      en: "Notable for grading each hadith (sahih, hasan, da'if) — a first in hadith scholarship.",
      id: "Terkenal karena memberi derajat pada setiap hadis (sahih, hasan, dhaif) — hal baru dalam ilmu hadis.",
    },
  },
  {
    slug: "nasai",
    apiSlug: "nasai",
    name: { en: "Sunan an-Nasa'i", id: "Sunan an-Nasa'i" },
    arabicName: "سنن النسائي",
    compiler: { en: "Imam an-Nasa'i", id: "Imam an-Nasa'i" },
    compilerArabic: "أحمد بن شعيب النسائي",
    totalHadith: 5761,
    eraCE: "915 CE / 303 AH",
    description: {
      en: "The strictest of the four Sunan in narrator criticism. Also called al-Sunan al-Sughra.",
      id: "Sunan paling ketat dalam kritik perawi. Juga disebut al-Sunan al-Sughra.",
    },
  },
  {
    slug: "ibnmajah",
    apiSlug: "ibnmajah",
    name: { en: "Sunan Ibn Majah", id: "Sunan Ibn Majah" },
    arabicName: "سنن ابن ماجه",
    compiler: { en: "Imam Ibn Majah", id: "Imam Ibn Majah" },
    compilerArabic: "محمد بن يزيد بن ماجه",
    totalHadith: 4341,
    eraCE: "887 CE / 273 AH",
    description: {
      en: "The last of the Six Books to be widely accepted. Contains ~1,300 unique hadiths not in the others.",
      id: "Kitab keenam terakhir yang diterima luas. Berisi sekitar 1.300 hadis unik yang tidak ada di kitab lain.",
    },
  },
] as const;

export type HadithBookSlug = (typeof HADITH_BOOKS)[number]["slug"];

export function getAllBooks(): ReadonlyArray<HadithBook> {
  return HADITH_BOOKS;
}

export function getBook(slug: string): HadithBook | undefined {
  return HADITH_BOOKS.find((b) => b.slug === slug);
}

/**
 * A single hadith. `number` is a string because a handful of hadiths in
 * al-Bukhari carry sub-numbers like "402.2". `translation.id` may be empty
 * when the Indonesian edition doesn't cover that hadith.
 */
export type Hadith = {
  book: HadithBookSlug;
  number: string;
  section: number;
  arabic: string;
  translation: Record<"en" | "id", string>;
  grade?: string | null;
};

export type HadithPage = {
  book: HadithBookSlug;
  total: number;
  page: number;
  size: number;
  totalPages: number;
  hadiths: Hadith[];
};

export const HADITH_PAGE_SIZE = 50;

// Resolve backend origin. In a Server Component we hit Spring Boot directly
// (localhost:8080) — bypasses the Next rewrite and one extra hop. In the
// browser we hit /api/qb/* which next.config.ts rewrites to the backend so
// CORS never comes into play.
function backendBase(): string {
  if (typeof window === "undefined") {
    return `${process.env.BACKEND_URL || "http://localhost:8080"}/api`;
  }
  return "/api/qb";
}

async function fetchJson<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${backendBase()}${path}`, {
      // Weekly ISR — matches route revalidate. Server-side only; ignored in browser.
      next: { revalidate: 604800 },
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

export async function loadHadith(
  book: HadithBookSlug,
  number: string | number,
): Promise<Hadith | undefined> {
  return fetchJson<Hadith>(`/hadith/${book}/${encodeURIComponent(String(number))}`);
}

export async function loadHadithPage(
  book: HadithBookSlug,
  page = 0,
  size: number = HADITH_PAGE_SIZE,
): Promise<HadithPage | undefined> {
  const safeSize = Math.max(1, Math.min(200, size));
  const safePage = Math.max(0, page);
  return fetchJson<HadithPage>(
    `/hadith/${book}?page=${safePage}&size=${safeSize}`,
  );
}
