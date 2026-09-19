// scripts/build-index.ts
//
// Rebuilds `data/quran/index/*.json` from `quran-data/verses/*.json`. The
// index is a compact, fast-to-load view of every ayah with its Juz, Hizb,
// Rub el-Hizb, Ruku, Manzil, Page, and Sajdah numbers, plus lookup
// buckets keyed by each division.
//
// Also rebuilds `data/quran/index/search.json` — the plain-text search
// index used by /search (Arabic diacritics stripped + Sahih Intl / Yusuf
// Ali / Pickthall translations + transliteration).
//
// Run this after any change to quran-data/verses/ or after adding a new
// translation to the cache.
//
// Usage: pnpm quran:build-index

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QDATA = join(ROOT, "quran-data");
const OUT = join(ROOT, "data", "quran", "index");
const LEGACY_DATA = join(ROOT, "data", "quran", "surahs");

type Verse = {
  verse_number: number;
  verse_key: string;
  hizb_number: number;
  rub_el_hizb_number: number;
  ruku_number: number;
  manzil_number: number;
  sajdah_number: number | null;
  text_uthmani: string;
  page_number: number;
  juz_number: number;
};

type LegacyAyah = {
  surah: number;
  ayah: number;
  arabic: string;
  transliteration?: string;
  translations: Record<string, string>;
};

// Arabic diacritics to strip for the search index.
const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}
async function writeJson(path: string, data: unknown, pretty = false): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    pretty ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data),
    "utf8",
  );
}

async function main() {
  console.log("Building Quran index from", QDATA, "→", OUT);

  const index: Array<{
    s: number;
    a: number;
    key: string;
    juz: number;
    hizb: number;
    rub: number;
    ruku: number;
    manzil: number;
    page: number;
    sajdah: number | null;
  }> = [];

  const byJuz: Record<string, string[]> = {};
  const byHizb: Record<string, string[]> = {};
  const byRuku: Record<string, string[]> = {}; // key = global ruku 1..558
  const byManzil: Record<string, string[]> = {};
  const byPage: Record<string, string[]> = {};

  for (let s = 1; s <= 114; s++) {
    const path = join(QDATA, "verses", `${s}.json`);
    if (!existsSync(path)) {
      console.error(`missing: ${path}`);
      process.exit(1);
    }
    const verses = await readJson<Verse[]>(path);
    for (const v of verses) {
      const row = {
        s,
        a: v.verse_number,
        key: v.verse_key,
        juz: v.juz_number,
        hizb: v.hizb_number,
        rub: v.rub_el_hizb_number,
        ruku: v.ruku_number,
        manzil: v.manzil_number,
        page: v.page_number,
        sajdah: v.sajdah_number,
      };
      index.push(row);
      (byJuz[String(row.juz)] ??= []).push(row.key);
      (byHizb[String(row.hizb)] ??= []).push(row.key);
      (byRuku[String(row.ruku)] ??= []).push(row.key);
      (byManzil[String(row.manzil)] ??= []).push(row.key);
      (byPage[String(row.page)] ??= []).push(row.key);
    }
  }

  await writeJson(join(OUT, "ayat.json"), index);
  await writeJson(join(OUT, "by-juz.json"), byJuz);
  await writeJson(join(OUT, "by-hizb.json"), byHizb);
  await writeJson(join(OUT, "by-ruku.json"), byRuku);
  await writeJson(join(OUT, "by-manzil.json"), byManzil);
  await writeJson(join(OUT, "by-page.json"), byPage);

  const meta = {
    totalAyat: index.length,
    juzCount: Object.keys(byJuz).length,
    hizbCount: Object.keys(byHizb).length,
    manzilCount: Object.keys(byManzil).length,
    pageCount: Object.keys(byPage).length,
    rukuCount: Object.keys(byRuku).length,
    sajdahCount: index.filter((r) => r.sajdah != null).length,
    builtAt: new Date().toISOString(),
  };
  await writeJson(join(OUT, "meta.json"), meta, true);
  console.log(`  index: ${index.length} ayat, ${Object.keys(byJuz).length} juz, ${Object.keys(byHizb).length} hizb, ${Object.keys(byRuku).length} ruku, ${Object.keys(byManzil).length} manzil, ${Object.keys(byPage).length} pages`);

  // ─── Search index ─────────────────────────────────────────────────
  console.log("Building search index …");
  if (!existsSync(LEGACY_DATA)) {
    console.warn(
      `  ⚠ ${LEGACY_DATA} not found — search index will lack English translations. Skipping search index build.`,
    );
    return;
  }
  const searchRows: Array<{
    key: string;
    s: number;
    k: number;
    ar: string;
    tr: string;
    y: string;
    p: string;
    t: string;
  }> = [];
  for (let s = 1; s <= 114; s++) {
    const legacyPath = join(LEGACY_DATA, `${s}.json`);
    if (!existsSync(legacyPath)) continue;
    const surah = await readJson<LegacyAyah[]>(legacyPath);
    for (const a of surah) {
      searchRows.push({
        key: `${a.surah}:${a.ayah}`,
        s: a.surah,
        k: a.ayah,
        ar: a.arabic.replace(DIACRITICS, "").replace(/\s+/g, " ").trim(),
        tr: a.translations["en.sahih"] ?? "",
        y: a.translations["en.yusufali"] ?? "",
        p: a.translations["en.pickthall"] ?? "",
        t: (a.transliteration ?? "").toLowerCase(),
      });
    }
  }
  await writeJson(join(OUT, "search.json"), searchRows);
  console.log(`  search: ${searchRows.length} rows`);

  console.log("✅ Index rebuilt.");
}

main().catch((err) => {
  console.error("build-index failed:", err);
  process.exit(1);
});
