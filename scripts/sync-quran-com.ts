// scripts/sync-quran-com.ts
//
// Downloads Quran.com Content APIs v4 data to local JSON files so the
// production app can run WITHOUT depending on quran.com uptime.
//
// Usage:
//   pnpm sync:quran-com                 # sync all content (idempotent, skips existing)
//   pnpm sync:quran-com --force         # re-download everything
//   pnpm sync:quran-com --only=verses   # verses only
//   pnpm sync:quran-com --only=audio    # audio segment timings only (no MP3s)
//   pnpm sync:quran-com --translation=20,84,22   # translations only
//
// Output tree:
//   quran-data/
//     chapters.json                     # 114 chapters metadata
//     translations.json                 # index of all available translations
//     tafsirs.json                      # index of all available tafsirs
//     recitations.json                  # index of all available reciters
//     verses/{1..114}.json              # verses w/ words + text_uthmani per surah
//     translations/{id}/{1..114}.json   # each translation split per surah
//     tafsirs/{id}/{1..114}.json        # each tafsir split per surah
//     audio-timings/{reciterId}/{1..114}.json  # word-level audio segments
//
// Copyright note: translations are copyrighted works served by Quran.com under
// arrangements with translators. Bundling them locally may violate those
// arrangements. For redistribution, use ONLY translations with permissive
// licenses (e.g. Sahih International is generally the safest bet).
// The Arabic Uthmani text is public domain (Tanzil / KFGQPC).

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Data lives in a dedicated top-level `quran-data/` folder — kept OUT of
// the mixed `data/` folder so it's clear this is the self-hosted Quran
// corpus, decoupled from other app data (cities, duas, salah, etc.).
const OUT = join(__dirname, "..", "quran-data");

const BASE = "https://api.quran.com/api/v4";

// Curated defaults we bundle by default. Others can be added on demand.
const DEFAULT_TRANSLATIONS = [20, 84, 22]; // Sahih Intl, Taqi Usmani, Yusuf Ali
const DEFAULT_TAFSIRS = [169]; // Ibn Kathir (Abridged)
const DEFAULT_RECITER = 7; // Mishari Al-`Afasy

// ─── CLI flag parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = {
  force: args.includes("--force"),
  only: (args.find((a) => a.startsWith("--only=")) || "").split("=")[1] || "all",
  translations: parseIdList(
    args.find((a) => a.startsWith("--translation=")) ||
      `--translation=${DEFAULT_TRANSLATIONS.join(",")}`,
  ),
  tafsirs: parseIdList(
    args.find((a) => a.startsWith("--tafsir=")) || `--tafsir=${DEFAULT_TAFSIRS.join(",")}`,
  ),
  reciters: parseIdList(
    args.find((a) => a.startsWith("--reciter=")) || `--reciter=${DEFAULT_RECITER}`,
  ),
};

function parseIdList(arg: string): number[] {
  return (arg.split("=")[1] ?? "")
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

// ─── Fetch helpers ───────────────────────────────────────────────────────

async function fetchJson<T>(path: string, retries = 5): Promise<T> {
  const url = `${BASE}${path}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * 2 ** attempt;
        console.warn(`  ${res.status} — backoff ${wait}ms (${attempt + 1}/${retries}) ${path}`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      const wait = 1000 * 2 ** attempt;
      console.warn(`  net error, retry in ${wait}ms — ${path}`);
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error(`gave up on ${url}`);
}

async function fetchAllVersesPages<T>(basePath: string): Promise<T[]> {
  // v4 verse endpoints paginate at ≤50 per page. Follow next_page until null.
  const merged: T[] = [];
  let page = 1;
  while (true) {
    const separator = basePath.includes("?") ? "&" : "?";
    const data = await fetchJson<{
      verses: T[];
      pagination: { next_page: number | null; total_pages: number; total_records: number };
    }>(`${basePath}${separator}page=${page}&per_page=50`);
    merged.push(...data.verses);
    if (!data.pagination.next_page) break;
    page = data.pagination.next_page;
    await sleep(120); // be polite
  }
  return merged;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function skipIfExists(path: string): Promise<boolean> {
  if (flags.force) return false;
  if (await exists(path)) {
    console.log(`  ✔ exists ${path.replace(`${OUT}/`, "")}`);
    return true;
  }
  return false;
}

// ─── Sync tasks ──────────────────────────────────────────────────────────

async function syncMetadata() {
  console.log("\n[1/5] Metadata (chapters, resource lists) …");
  // Chapters
  {
    const path = join(OUT, "chapters.json");
    if (!(await skipIfExists(path))) {
      const data = await fetchJson<{ chapters: unknown[] }>("/chapters?language=en");
      await writeJson(path, data.chapters);
      console.log(`  → chapters.json (${data.chapters.length} chapters)`);
    }
  }
  // Translations index
  {
    const path = join(OUT, "translations.json");
    if (!(await skipIfExists(path))) {
      const data = await fetchJson<{ translations: unknown[] }>(
        "/resources/translations?language=en",
      );
      await writeJson(path, data.translations);
      console.log(`  → translations.json (${data.translations.length} translations)`);
    }
  }
  // Tafsirs index
  {
    const path = join(OUT, "tafsirs.json");
    if (!(await skipIfExists(path))) {
      const data = await fetchJson<{ tafsirs: unknown[] }>("/resources/tafsirs?language=en");
      await writeJson(path, data.tafsirs);
      console.log(`  → tafsirs.json (${data.tafsirs.length} tafsirs)`);
    }
  }
  // Recitations index
  {
    const path = join(OUT, "recitations.json");
    if (!(await skipIfExists(path))) {
      const data = await fetchJson<{ recitations: unknown[] }>(
        "/resources/recitations?language=en",
      );
      await writeJson(path, data.recitations);
      console.log(`  → recitations.json (${data.recitations.length} reciters)`);
    }
  }
}

async function syncVerses() {
  console.log("\n[2/5] Verses (Uthmani text + words + word-by-word data) …");
  const wordFields =
    "text_uthmani,text_indopak,translation,transliteration,audio_url,location,char_type_name";
  const fields = "text_uthmani,text_indopak,text_imlaei,page_number,juz_number";
  for (let s = 1; s <= 114; s++) {
    const path = join(OUT, "verses", `${s}.json`);
    if (await skipIfExists(path)) continue;
    console.log(`  fetching surah ${s} …`);
    const verses = await fetchAllVersesPages(
      `/verses/by_chapter/${s}?words=true&word_fields=${wordFields}&fields=${fields}&language=en`,
    );
    await writeJson(path, verses);
    console.log(`  → verses/${s}.json (${verses.length} ayahs)`);
    await sleep(200);
  }
}

async function syncTranslations(ids: number[]) {
  console.log(`\n[3/5] Translations (${ids.join(", ")}) …`);
  for (const id of ids) {
    for (let s = 1; s <= 114; s++) {
      const path = join(OUT, "translations", String(id), `${s}.json`);
      if (await skipIfExists(path)) continue;
      const verses = await fetchAllVersesPages<{
        verse_key: string;
        translations?: Array<{ text: string }>;
      }>(`/verses/by_chapter/${s}?translations=${id}&language=en`);
      // Reduce to just {verse_key, text} per verse.
      const compact = verses.map((v) => ({
        verse_key: v.verse_key,
        text: v.translations?.[0]?.text ?? "",
      }));
      await writeJson(path, compact);
      console.log(`  → translations/${id}/${s}.json`);
      await sleep(180);
    }
  }
}

async function syncTafsirs(ids: number[]) {
  // The /verses/by_chapter?tafsirs={id} endpoint does NOT return tafsir text —
  // the correct endpoint is /tafsirs/{id}/by_ayah/{surah}:{ayah}. That is
  // per-ayah, so 6,236 requests per tafsir; we throttle to ~4 req/s.
  console.log(`\n[4/5] Tafsirs (${ids.join(", ")}) — per-ayah fetch, ~6236 requests each …`);
  const chapters = await import(join(OUT, "chapters.json"), {
    with: { type: "json" },
  }).then((m) => m.default as Array<{ id: number; verses_count: number }>);
  for (const id of ids) {
    for (let s = 1; s <= 114; s++) {
      const path = join(OUT, "tafsirs", String(id), `${s}.json`);
      if (await skipIfExists(path)) continue;
      const chapter = chapters.find((c) => c.id === s);
      if (!chapter) continue;
      const compact: Array<{ verse_key: string; text: string }> = [];
      for (let a = 1; a <= chapter.verses_count; a++) {
        const key = `${s}:${a}`;
        try {
          const data = await fetchJson<{ tafsir?: { text?: string } }>(
            `/tafsirs/${id}/by_ayah/${key}`,
          );
          compact.push({ verse_key: key, text: data.tafsir?.text ?? "" });
        } catch (err) {
          console.warn(`    ⚠ ${key} failed:`, (err as Error).message);
          compact.push({ verse_key: key, text: "" });
        }
        await sleep(220); // ~4.5 req/s
      }
      await writeJson(path, compact);
      const filled = compact.filter((c) => c.text).length;
      console.log(`  → tafsirs/${id}/${s}.json (${filled}/${compact.length} ayahs with text)`);
    }
  }
}

async function syncAudioTimings(reciterIds: number[]) {
  console.log(`\n[5/5] Audio timings (reciters ${reciterIds.join(", ")}) …`);
  console.log("  Word-level segments come from /verses/by_chapter?audio={id}.");
  console.log("  MP3s are streamed from audio.qurancdn.com at runtime (huge, don't self-host).");
  for (const reciterId of reciterIds) {
    for (let s = 1; s <= 114; s++) {
      const path = join(OUT, "audio-timings", String(reciterId), `${s}.json`);
      if (await skipIfExists(path)) continue;
      // Paginate through /verses/by_chapter with audio={reciterId}. Each verse
      // gets an `audio: { url, segments: [[wordId, wordPos, startMs, endMs], ...] }`
      // block. Segments is what we care about — pure timing data, no MP3 payload.
      const verses = await fetchAllVersesPages<{
        verse_key: string;
        audio?: { url: string; segments: Array<[number, number, number, number]> };
      }>(`/verses/by_chapter/${s}?audio=${reciterId}`);
      const compact = verses.map((v) => ({
        verse_key: v.verse_key,
        audio_url: v.audio?.url ?? null,
        segments: v.audio?.segments ?? [],
      }));
      await writeJson(path, compact);
      const withSegs = compact.filter((c) => c.segments.length > 0).length;
      console.log(
        `  → audio-timings/${reciterId}/${s}.json (${compact.length} ayahs, ${withSegs} with segments)`,
      );
      await sleep(200);
    }
  }

  // Also fetch full-surah chapter recitations (single MP3 per surah).
  console.log("  → also fetching /chapter_recitations for full-surah MP3 URLs …");
  for (const reciterId of reciterIds) {
    const path = join(OUT, "chapter-recitations", `${reciterId}.json`);
    if (await skipIfExists(path)) continue;
    const rows: Array<{ chapter_id: number; audio_url: string; file_size: number }> = [];
    for (let s = 1; s <= 114; s++) {
      try {
        const data = await fetchJson<{
          audio_file: { chapter_id: number; audio_url: string; file_size: number };
        }>(`/chapter_recitations/${reciterId}/${s}`);
        rows.push({
          chapter_id: data.audio_file.chapter_id,
          audio_url: data.audio_file.audio_url,
          file_size: data.audio_file.file_size,
        });
      } catch (err) {
        console.warn(`    ⚠ chapter_recitations ${reciterId}/${s}:`, (err as Error).message);
      }
      await sleep(150);
    }
    await writeJson(path, rows);
    console.log(`  → chapter-recitations/${reciterId}.json (${rows.length} chapters)`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Sync Quran.com Content APIs v4 → local JSON");
  console.log(`Output: ${OUT}`);
  console.log(`Flags:  ${JSON.stringify(flags, null, 2).replace(/\n\s+/g, " ")}`);
  console.log("═══════════════════════════════════════════════════════════");

  await mkdir(OUT, { recursive: true });

  const only = flags.only.toLowerCase();
  const doAll = only === "all";

  const state = await loadSyncState();
  const started = Date.now();

  try {
    if (doAll || only === "metadata") {
      await syncMetadata();
      await recordSyncSuccess(state, "metadata");
    }
    if (doAll || only === "verses") {
      await syncVerses();
      await recordSyncSuccess(state, "verses");
    }
    if (doAll || only === "translations") {
      await syncTranslations(flags.translations);
      await recordSyncSuccess(state, `translations:${flags.translations.join(",")}`);
    }
    if (doAll || only === "tafsirs") {
      await syncTafsirs(flags.tafsirs);
      await recordSyncSuccess(state, `tafsirs:${flags.tafsirs.join(",")}`);
    }
    if (doAll || only === "audio") {
      await syncAudioTimings(flags.reciters);
      await recordSyncSuccess(state, `audio:${flags.reciters.join(",")}`);
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n✅ Sync complete in ${elapsed}s.`);
    console.log(
      "   To use local data instead of the live API, set QURAN_SOURCE=local in your env.",
    );
  } catch (err) {
    await recordSyncFailure(state, only, (err as Error).message);
    throw err;
  }
}

// ─── Sync state ─────────────────────────────────────────────────────────
// Persistent per-resource state so we can tell what's synced when, and so a
// future admin dashboard can display it. See docs/quran-sync.md for the shape.

const SYNC_STATE_PATH = join(OUT, "sync-state.json");

type ResourceStatus =
  | { status: "never" }
  | { status: "success"; lastSyncAt: string; contentVersion: number }
  | { status: "failed"; lastAttemptAt: string; error: string };

type SyncState = {
  version: number;
  resources: Record<string, ResourceStatus>;
};

async function loadSyncState(): Promise<SyncState> {
  try {
    const buf = await import("node:fs").then((m) =>
      m.promises.readFile(SYNC_STATE_PATH, "utf8"),
    );
    return JSON.parse(buf) as SyncState;
  } catch {
    return { version: 1, resources: {} };
  }
}

async function persistSyncState(state: SyncState): Promise<void> {
  await writeJson(SYNC_STATE_PATH, state);
}

async function recordSyncSuccess(state: SyncState, resource: string): Promise<void> {
  const prev = state.resources[resource];
  const contentVersion =
    prev && prev.status === "success" ? prev.contentVersion + 1 : 1;
  state.resources[resource] = {
    status: "success",
    lastSyncAt: new Date().toISOString(),
    contentVersion,
  };
  await persistSyncState(state);
}

async function recordSyncFailure(
  state: SyncState,
  resource: string,
  error: string,
): Promise<void> {
  state.resources[resource] = {
    status: "failed",
    lastAttemptAt: new Date().toISOString(),
    error,
  };
  await persistSyncState(state);
}

main().catch((err) => {
  console.error("\n❌ Sync failed:", err);
  process.exit(1);
});
