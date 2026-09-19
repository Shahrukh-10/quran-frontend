// Madinah muṣḥaf pagination — reshape our per-surah JSON corpus into a page-by-page
// layout (604 pages total). Runs at build time (via `getAllMushafPages()` called from
// Server Components), so the client receives a ready-to-render array with zero
// per-request compute.
//
// The mapping key is each ayah's `page` property, which comes from Al-Quran Cloud
// and matches the standard Madinah muṣḥaf. We also carry `juz` for the page header.

import { readFileSync } from "node:fs";
import path from "node:path";
import { getAllSurahs, type getSurahByNumber } from "@/lib/quran";
import type { Ayah } from "@/lib/quran";

export type MushafAyah = { s: number; a: number; text: string };

export type MushafPage = {
  page: number; // 1..604
  juz: number;
  surahNames: string[]; // English names touched by this page
  surahNamesAr: string[]; // Arabic names touched by this page
  ayat: MushafAyah[];
  // The FIRST ayah on the page whose number === 1 triggers a surah header render.
  surahHeader?: {
    surah: number;
    name: string;
    nameAr: string;
    meccan: boolean;
    ayat: number;
  };
  // Bismillah is rendered whenever a surah starts on the page EXCEPT for surah 1
  // (already includes it as ayah 1) and surah 9 (At-Tawbah, no bismillah).
  bismillah?: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data", "quran", "surahs");

let cached: MushafPage[] | undefined;

/** Build (once) all 604 Madinah-muṣḥaf pages by walking data/quran/surahs/*.json. */
export function getAllMushafPages(): MushafPage[] {
  if (cached) return cached;

  const pagesMap = new Map<number, MushafPage>();

  for (const surahMeta of getAllSurahs()) {
    let ayat: Ayah[];
    try {
      const raw = readFileSync(path.join(DATA_DIR, `${surahMeta.number}.json`), "utf8");
      ayat = JSON.parse(raw) as Ayah[];
    } catch {
      continue; // corpus not fetched — skip
    }

    for (const a of ayat) {
      let page = pagesMap.get(a.page);
      if (!page) {
        page = {
          page: a.page,
          juz: a.juz,
          surahNames: [],
          surahNamesAr: [],
          ayat: [],
        };
        pagesMap.set(a.page, page);
      }
      if (!page.surahNames.includes(surahMeta.name)) {
        page.surahNames.push(surahMeta.name);
        page.surahNamesAr.push(surahMeta.arabicName);
      }
      // Attach a surah header if this ayah opens a new surah (ayah==1) AND is
      // the FIRST ayah placed on this page (so the header renders once, on top).
      if (a.ayah === 1 && !page.surahHeader) {
        page.surahHeader = {
          surah: surahMeta.number,
          name: surahMeta.name,
          nameAr: surahMeta.arabicName,
          meccan: surahMeta.revelation === "meccan",
          ayat: surahMeta.ayahCount,
        };
        // Bismillah rendered for every new surah except Al-Fātiḥah (ayah 1 IS the
        // bismillah) and At-Tawbah (no bismillah — classical scholarly consensus).
        if (surahMeta.number !== 1 && surahMeta.number !== 9) {
          page.bismillah = true;
        }
      }

      page.ayat.push({ s: a.surah, a: a.ayah, text: a.arabic });
    }
  }

  cached = Array.from(pagesMap.values()).sort((a, b) => a.page - b.page);
  return cached;
}

/** Look up which page a given (surah, ayah) sits on — used for deep-linking. */
export function pageOfAyah(surah: number, ayah: number): number | undefined {
  const all = getAllMushafPages();
  for (const p of all) {
    if (p.ayat.some((x) => x.s === surah && x.a === ayah)) return p.page;
  }
  return undefined;
}

/** Return the total number of pages actually present (should be 604 when full corpus is fetched). */
export function totalMushafPages(): number {
  return getAllMushafPages().length;
}

// Silence unused import when Ayah isn't referenced outside the JSON.parse cast
export type __unused_Ayah = Ayah;
export type __unused_SurahMeta = ReturnType<typeof getSurahByNumber>;
