// scripts/quran-verify.ts
//
// Data integrity gate for the local Quran cache. Exits non-zero if ANY
// critical check fails so CI can gate deploys on it.
//
// Usage:
//   pnpm quran:verify           # human-readable report, non-zero exit on failure
//   pnpm quran:verify --json    # machine-readable JSON report
//
// Checks (in order):
//   1. Every 1..114 chapter file present.
//   2. Chapter row counts match ayah counts across all files.
//   3. 6,236 total ayat, verse_key format valid ("s:a"), no duplicates.
//   4. Every ayah has non-empty text_uthmani.
//   5. Word alignment: word `location` matches `${surah}:${ayah}:${position}`.
//   6. Translations: every downloaded translation has 6,236 rows, non-empty
//      text on >99% of ayat.
//   7. Tafsirs: same shape check + text density warning (< 99% fills logs
//      but doesn't fail — tafsirs are large & occasionally rate-limited).
//   8. Audio timings: every ayah has a segments array. Segments-empty count
//      is a warning, not a failure (some reciters legitimately lack them).
//   9. Chapter recitations: 114 rows per reciter.
//  10. Cross-index: `data/quran/index/ayat.json` matches quran-data (6,236 rows,
//      same verse_keys, same juz/hizb/ruku/manzil/page mappings).
//
// EXIT CODES
//   0 — every critical check passed
//   1 — at least one critical check failed (see report)
//   2 — the verifier itself crashed

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const QDATA = join(ROOT, "quran-data");
const INDEX = join(ROOT, "data", "quran", "index");

const args = process.argv.slice(2);
const asJson = args.includes("--json");

type Severity = "PASS" | "WARN" | "FAIL";
type CheckResult = { name: string; severity: Severity; message: string; detail?: unknown };

const results: CheckResult[] = [];
function pass(name: string, message: string, detail?: unknown) {
  results.push({ name, severity: "PASS", message, detail });
}
function warn(name: string, message: string, detail?: unknown) {
  results.push({ name, severity: "WARN", message, detail });
}
function fail(name: string, message: string, detail?: unknown) {
  results.push({ name, severity: "FAIL", message, detail });
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

// ─── 1. chapters.json + verses/{s}.json presence ────────────────────────

type Chapter = {
  id: number;
  verses_count: number;
  name_simple: string;
  pages: [number, number];
};

async function checkChapterFiles(): Promise<{ chapters: Chapter[] } | null> {
  const chaptersPath = join(QDATA, "chapters.json");
  if (!existsSync(chaptersPath)) {
    fail("chapters.json", "MISSING — run `pnpm quran:bootstrap` first");
    return null;
  }
  const chapters = await readJson<Chapter[]>(chaptersPath);
  if (chapters.length !== 114) {
    fail("chapters.json", `Expected 114 chapters, got ${chapters.length}`);
    return null;
  }
  pass("chapters.json", `114 chapters present`);

  let missing = 0;
  for (let s = 1; s <= 114; s++) {
    const p = join(QDATA, "verses", `${s}.json`);
    if (!existsSync(p)) missing++;
  }
  if (missing > 0) {
    fail("verses/*.json presence", `${missing} of 114 surah verse files missing`);
    return null;
  }
  pass("verses/*.json presence", `All 114 surah verse files present`);
  return { chapters };
}

// ─── 2–5. verse-level integrity ─────────────────────────────────────────

type Verse = {
  id: number;
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
  words: Array<{ location: string; position: number; text_uthmani: string }>;
};

async function checkVerseIntegrity(chapters: Chapter[]): Promise<Verse[] | null> {
  const all: Verse[] = [];
  let countMismatch = 0;
  for (const c of chapters) {
    const verses = await readJson<Verse[]>(join(QDATA, "verses", `${c.id}.json`));
    if (verses.length !== c.verses_count) {
      fail(
        "chapter row-count",
        `Surah ${c.id} (${c.name_simple}): expected ${c.verses_count} ayat, got ${verses.length}`,
      );
      countMismatch++;
    }
    all.push(...verses);
  }
  if (countMismatch === 0) {
    pass("chapter row-count", "Every surah has the expected ayah count");
  }

  if (all.length !== 6236) {
    fail("total ayat", `Expected 6236 ayat, got ${all.length}`);
    return null;
  }
  pass("total ayat", "6,236 ayat total");

  // verse_key format
  const seen = new Set<string>();
  const dupes: string[] = [];
  const badKeys: string[] = [];
  const emptyText: string[] = [];
  for (const v of all) {
    if (!/^\d{1,3}:\d{1,3}$/.test(v.verse_key)) badKeys.push(v.verse_key);
    if (seen.has(v.verse_key)) dupes.push(v.verse_key);
    seen.add(v.verse_key);
    if (!v.text_uthmani || v.text_uthmani.length < 3) emptyText.push(v.verse_key);
  }
  if (badKeys.length) {
    fail("verse_key format", `${badKeys.length} malformed verse_keys`, badKeys.slice(0, 5));
  } else {
    pass("verse_key format", "All verse_keys well-formed");
  }
  if (dupes.length) fail("verse_key uniqueness", `${dupes.length} duplicates`, dupes.slice(0, 5));
  else pass("verse_key uniqueness", "No duplicate verse_keys");
  if (emptyText.length) {
    fail("uthmani text", `${emptyText.length} ayat with empty/short text`, emptyText.slice(0, 5));
  } else {
    pass("uthmani text", "Every ayah has non-empty Uthmani text");
  }

  // Word `location` alignment
  const misaligned: string[] = [];
  let wordCount = 0;
  for (const v of all) {
    for (const w of v.words) {
      wordCount++;
      const expected = `${v.verse_key.replace(":", ":")}:${w.position}`;
      if (w.location !== expected) {
        misaligned.push(`${v.verse_key} pos ${w.position} → ${w.location}`);
      }
    }
  }
  if (misaligned.length) {
    fail(
      "word alignment",
      `${misaligned.length} words with location != s:a:pos`,
      misaligned.slice(0, 5),
    );
  } else {
    pass("word alignment", `All ${wordCount.toLocaleString()} words correctly located`);
  }

  return all;
}

// ─── 6–7. translations + tafsirs ────────────────────────────────────────

type CompactRow = { verse_key: string; text: string };

async function checkResourceSet(
  kind: "translations" | "tafsirs",
  failOnLowDensity: boolean,
): Promise<void> {
  const dir = join(QDATA, kind);
  if (!existsSync(dir)) {
    warn(`${kind}`, "Directory missing — no translations/tafsirs synced");
    return;
  }
  const { readdir } = await import("node:fs/promises");
  const ids = (await readdir(dir)).filter((n) => /^\d+$/.test(n));
  if (!ids.length) {
    warn(`${kind}`, "No resources synced");
    return;
  }
  for (const id of ids) {
    let total = 0;
    let filled = 0;
    let filesMissing = 0;
    for (let s = 1; s <= 114; s++) {
      const p = join(dir, id, `${s}.json`);
      if (!existsSync(p)) {
        filesMissing++;
        continue;
      }
      const rows = await readJson<CompactRow[]>(p);
      total += rows.length;
      filled += rows.filter((r) => r.text && r.text.length > 0).length;
    }
    if (filesMissing) {
      const name = `${kind}/${id}`;
      if (kind === "translations") {
        fail(name, `${filesMissing} of 114 surah files missing`);
      } else {
        warn(name, `${filesMissing} of 114 surah files missing (sync in progress?)`);
      }
    }
    if (total === 0) {
      fail(`${kind}/${id}`, "No rows at all");
      continue;
    }
    if (total !== 6236 && filesMissing === 0) {
      fail(`${kind}/${id}`, `Expected 6236 rows, got ${total}`);
    }
    const density = filled / total;
    const label = `${kind}/${id} density`;
    if (density > 0.99) {
      pass(label, `${filled.toLocaleString()}/${total.toLocaleString()} filled (${(density * 100).toFixed(2)}%)`);
    } else if (failOnLowDensity && density < 0.5) {
      fail(label, `Only ${(density * 100).toFixed(1)}% of ayat have text`);
    } else {
      warn(
        label,
        `${filled.toLocaleString()}/${total.toLocaleString()} filled (${(density * 100).toFixed(2)}%) — expected >99%`,
      );
    }
  }
}

// ─── 8. audio timings ───────────────────────────────────────────────────

type AudioRow = {
  verse_key: string;
  audio_url: string | null;
  segments: Array<[number, number, number, number]>;
};

async function checkAudioTimings(): Promise<void> {
  const dir = join(QDATA, "audio-timings");
  if (!existsSync(dir)) {
    warn("audio-timings", "Directory missing");
    return;
  }
  const { readdir } = await import("node:fs/promises");
  const reciterIds = (await readdir(dir)).filter((n) => /^\d+$/.test(n));
  if (!reciterIds.length) {
    warn("audio-timings", "No reciters synced");
    return;
  }
  for (const rid of reciterIds) {
    let total = 0;
    let withSegments = 0;
    let filesMissing = 0;
    for (let s = 1; s <= 114; s++) {
      const p = join(dir, rid, `${s}.json`);
      if (!existsSync(p)) {
        filesMissing++;
        continue;
      }
      const rows = await readJson<AudioRow[]>(p);
      total += rows.length;
      withSegments += rows.filter((r) => Array.isArray(r.segments) && r.segments.length > 0).length;
    }
    const name = `audio-timings/${rid}`;
    if (filesMissing) warn(name, `${filesMissing} of 114 surah files missing`);
    if (total !== 6236 && filesMissing === 0) {
      fail(name, `Expected 6236 rows, got ${total}`);
    }
    const density = total === 0 ? 0 : withSegments / total;
    if (density > 0.99) {
      pass(`${name} segments`, `${withSegments}/${total} ayat have word-level segments`);
    } else if (density > 0.5) {
      warn(`${name} segments`, `Only ${withSegments}/${total} ayat have segments (${(density * 100).toFixed(1)}%)`);
    } else {
      fail(`${name} segments`, `Only ${(density * 100).toFixed(1)}% of ayat have segments`);
    }
  }
}

// ─── 9. chapter recitations ─────────────────────────────────────────────

async function checkChapterRecitations(): Promise<void> {
  const dir = join(QDATA, "chapter-recitations");
  if (!existsSync(dir)) {
    warn("chapter-recitations", "Directory missing — full-surah MP3 URLs not synced");
    return;
  }
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(dir)).filter((n) => n.endsWith(".json"));
  if (!files.length) {
    warn("chapter-recitations", "No reciter files present");
    return;
  }
  for (const f of files) {
    const rows = await readJson<Array<{ chapter_id: number; audio_url: string }>>(
      join(dir, f),
    );
    const withUrl = rows.filter((r) => r.audio_url && r.audio_url.startsWith("http")).length;
    if (rows.length !== 114) {
      fail(`chapter-recitations/${f}`, `Expected 114 chapters, got ${rows.length}`);
    } else if (withUrl !== 114) {
      warn(`chapter-recitations/${f}`, `${withUrl}/114 have valid HTTPS URLs`);
    } else {
      pass(`chapter-recitations/${f}`, "114 chapters with valid MP3 URLs");
    }
  }
}

// ─── 10. index cross-check ──────────────────────────────────────────────

async function checkIndex(verses: Verse[]): Promise<void> {
  const p = join(INDEX, "ayat.json");
  if (!existsSync(p)) {
    fail("index/ayat.json", "MISSING — run `pnpm quran:bootstrap` to rebuild");
    return;
  }
  const rows = await readJson<
    Array<{
      s: number;
      a: number;
      key: string;
      juz: number;
      hizb: number;
      ruku: number;
      manzil: number;
      page: number;
    }>
  >(p);
  if (rows.length !== 6236) {
    fail("index/ayat.json count", `Expected 6236 rows, got ${rows.length}`);
    return;
  }
  pass("index/ayat.json count", "6,236 index rows");

  // Cross-check every verse against the index
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const mismatches: string[] = [];
  for (const v of verses) {
    const r = byKey.get(v.verse_key);
    if (!r) {
      mismatches.push(`${v.verse_key} missing from index`);
      continue;
    }
    if (
      r.juz !== v.juz_number ||
      r.hizb !== v.hizb_number ||
      r.ruku !== v.ruku_number ||
      r.manzil !== v.manzil_number ||
      r.page !== v.page_number
    ) {
      mismatches.push(`${v.verse_key} index mismatch`);
    }
  }
  if (mismatches.length) {
    fail("index cross-check", `${mismatches.length} mismatches`, mismatches.slice(0, 5));
  } else {
    pass("index cross-check", "Every ayah's juz/hizb/ruku/manzil/page matches the index");
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const step1 = await checkChapterFiles();
  if (!step1) return report();
  const verses = await checkVerseIntegrity(step1.chapters);
  if (!verses) return report();
  await checkResourceSet("translations", true);
  await checkResourceSet("tafsirs", false); // tafsirs may lag while sync runs
  await checkAudioTimings();
  await checkChapterRecitations();
  await checkIndex(verses);
  report();
}

function report() {
  const failures = results.filter((r) => r.severity === "FAIL");
  const warns = results.filter((r) => r.severity === "WARN");
  const passes = results.filter((r) => r.severity === "PASS");

  if (asJson) {
    process.stdout.write(
      JSON.stringify(
        {
          summary: { pass: passes.length, warn: warns.length, fail: failures.length },
          results,
        },
        null,
        2,
      ),
    );
    process.stdout.write("\n");
  } else {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("Quran data integrity report");
    console.log("═══════════════════════════════════════════════════════════");
    for (const r of results) {
      const badge =
        r.severity === "PASS" ? "✅" : r.severity === "WARN" ? "⚠️ " : "❌";
      console.log(`${badge} [${r.severity}] ${r.name}: ${r.message}`);
      if (r.severity !== "PASS" && r.detail) {
        console.log(`     detail: ${JSON.stringify(r.detail)}`);
      }
    }
    console.log("───────────────────────────────────────────────────────────");
    console.log(
      `Summary: ${passes.length} passed · ${warns.length} warned · ${failures.length} failed`,
    );
    console.log("═══════════════════════════════════════════════════════════\n");
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Verifier crashed:", err);
  process.exit(2);
});
