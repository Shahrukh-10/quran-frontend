// scripts/fetch-quran.ts
// Runs offline against Al-Quran Cloud to build the static Quran corpus.
//
// Usage:
//   pnpm fetch:quran           # fetch missing surahs only
//   pnpm fetch:quran --force   # re-fetch everything
//
// Writes to data/quran/surahs/{1..114}.json. Audio URLs are computed, not fetched.
// Translations bundled: en.sahih, en.pickthall, en.yusufali, id.indonesian.
//
// Source: https://alquran.cloud/api  (free, no key, generous rate limit)
//
// Do NOT run this at Vercel/CF build time — always run locally and commit the JSON so
// production builds are hermetic and reproducible.

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "quran", "surahs");

const EDITIONS = {
  arabic: "quran-uthmani",
  transliteration: "en.transliteration",
  translations: ["en.sahih", "en.pickthall", "en.yusufali", "id.indonesian"] as const,
};

const RECITER = "ar.alafasy"; // audio URLs are deterministic, we just embed the primary one.

type ApiAyah = {
  number: number;
  numberInSurah: number;
  text: string;
  juz: number;
  page: number;
  hizb: number;
};

async function fetchEdition(surah: number, edition: string): Promise<ApiAyah[]> {
  const url = `https://api.alquran.cloud/v1/surah/${surah}/${edition}`;
  // Retry on 429 (rate limit) and transient 5xx with exponential backoff.
  const MAX = 6;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * 2 ** attempt; // 1s, 2s, 4s, 8s, 16s, 32s
        console.warn(
          `  ${res.status} on ${edition} — backing off ${wait}ms (attempt ${attempt + 1}/${MAX})`,
        );
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      const json = (await res.json()) as { data: { ayahs: ApiAyah[] } };
      return json.data.ayahs;
    } catch (err) {
      lastErr = err;
      const wait = 1000 * 2 ** attempt;
      console.warn(`  network error on ${edition} — retry in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr ?? new Error(`${url} — gave up after ${MAX} attempts`);
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes("--force");
  await mkdir(OUT_DIR, { recursive: true });

  for (let s = 1; s <= 114; s++) {
    const outPath = join(OUT_DIR, `${s}.json`);
    if (!force && (await exists(outPath))) {
      // Resume-safe: don't refetch surahs already on disk.
      console.log(`Skipping surah ${s} (already fetched). Use --force to redo.`);
      continue;
    }

    console.log(`Fetching surah ${s}…`);
    // Serial fetch (not parallel) — the free API rate-limits aggressively on burst.
    // 6 editions × ~200ms each ≈ 1.2s per surah × 114 = ~2.5 min total.
    const arabic = await fetchEdition(s, EDITIONS.arabic);
    await new Promise((r) => setTimeout(r, 200));
    const translit = await fetchEdition(s, EDITIONS.transliteration);
    await new Promise((r) => setTimeout(r, 200));
    const trs: ApiAyah[][] = [];
    for (const tid of EDITIONS.translations) {
      trs.push(await fetchEdition(s, tid));
      await new Promise((r) => setTimeout(r, 200));
    }

    const merged = arabic.map((a, i) => {
      const translations: Record<string, string> = {};
      EDITIONS.translations.forEach((tid, ti) => {
        translations[tid] = trs[ti]?.[i]?.text ?? "";
      });
      return {
        surah: s,
        ayah: a.numberInSurah,
        arabic: a.text,
        transliteration: translit[i]?.text,
        translations,
        juz: a.juz,
        page: a.page,
        hizb: a.hizb,
        audio: {
          [RECITER]: `https://cdn.islamic.network/quran/audio/128/${RECITER}/${a.number}.mp3`,
        },
      };
    });

    await writeFile(outPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    // Al-Quran Cloud is generous but be polite.
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log("Done. Committed data files are the SSG source of truth.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
