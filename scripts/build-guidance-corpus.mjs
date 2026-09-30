#!/usr/bin/env node
/**
 * RAG corpus builder for /find-guidance.
 *
 * Flattens the Quran (data/quran/surahs/*.json), duas (data/duas/duas.json),
 * and a curated top-hadith subset into one embedded index.
 *
 * Output: data/guidance/corpus.json — array of
 *   { id, kind: 'ayah'|'dua'|'hadith', ref, title, text, source, vector }
 *
 * Vectors come from Cloudflare Workers AI @cf/baai/bge-base-en-v1.5 (768 dims).
 * Free tier is 10k neurons/day — one embedding = 1 neuron, so we batch and
 * checkpoint aggressively.
 *
 * Run: node scripts/build-guidance-corpus.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Load env
const envFile = fs.readFileSync(path.join(REPO_ROOT, ".env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (m && !line.startsWith("#")) process.env[m[1]] = m[2];
}
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_WORKERS_AI_TOKEN;
if (!CF_ACCOUNT || !CF_TOKEN) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_WORKERS_AI_TOKEN");
  process.exit(1);
}

const CORPUS_DIR = path.join(REPO_ROOT, "data/guidance");
fs.mkdirSync(CORPUS_DIR, { recursive: true });
const OUT_PATH = path.join(CORPUS_DIR, "corpus.json");
const CKPT_PATH = path.join(CORPUS_DIR, "corpus.ckpt.json");

function loadOrEmpty() {
  if (fs.existsSync(CKPT_PATH)) {
    return JSON.parse(fs.readFileSync(CKPT_PATH, "utf8"));
  }
  return { done: {}, entries: [] };
}
function saveCkpt(state) {
  fs.writeFileSync(CKPT_PATH, JSON.stringify(state));
}

// --------- Corpus flattening ---------

function flattenQuran() {
  const rows = [];
  const surahsIdx = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "data/quran/surahs.json"), "utf8"),
  );
  const surahMeta = new Map();
  for (const s of surahsIdx) surahMeta.set(s.number, s);
  for (let n = 1; n <= 114; n++) {
    const fp = path.join(REPO_ROOT, `data/quran/surahs/${n}.json`);
    if (!fs.existsSync(fp)) continue;
    const ayahs = JSON.parse(fs.readFileSync(fp, "utf8"));
    const surahName =
      surahMeta.get(n)?.name?.en ?? surahMeta.get(n)?.transliteration ?? `Surah ${n}`;
    for (const a of ayahs) {
      const en =
        a.translations?.["en.sahih"] ||
        a.translations?.["en.pickthall"] ||
        a.translations?.["en.yusufali"];
      if (!en) continue;
      rows.push({
        id: `ayah:${n}:${a.ayah}`,
        kind: "ayah",
        ref: `${n}:${a.ayah}`,
        title: `${surahName} ${n}:${a.ayah}`,
        text: en,
        arabic: a.arabic,
        source: `Quran ${n}:${a.ayah}`,
        href: `/quran/${n}/${a.ayah}`,
      });
    }
  }
  return rows;
}

function flattenDuas() {
  const rows = [];
  const duas = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "data/duas/duas.json"), "utf8"));
  for (const d of duas.duas || duas) {
    const en = d.translation?.en || d.translation;
    const title = d.title?.en || d.title;
    rows.push({
      id: `dua:${d.category}/${d.slug}`,
      kind: "dua",
      ref: `${d.category}/${d.slug}`,
      title: title,
      text: `${title}. ${en}`,
      arabic: d.arabic,
      source: d.source || "",
      href: `/duas/${d.category}/${d.slug}`,
    });
  }
  return rows;
}

/**
 * Load a curated set of hadith IDs to embed. We can't embed all 40k on the
 * free tier (10k neurons/day cap), so we start with a shortlist: the ~40
 * hadith already referenced in situations.json + a hand-picked list of high-
 * traffic hadith across topics (patience, prayer, kindness, gratitude, ...).
 *
 * Later we'll expand to top-1000 hadith from Bukhari/Muslim using metadata
 * from the backend. For v1 the curated list gives real coverage without
 * blowing the budget.
 */
async function flattenHadith() {
  const rows = [];
  // First: every hadith already cited in situations.json
  const sit = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "data/graph/situations.json"), "utf8"),
  );
  const seen = new Set();
  const refs = [];
  for (const s of sit.situations) {
    for (const sol of s.solutions) {
      if (sol.type === "hadith" && !seen.has(sol.ref)) {
        seen.add(sol.ref);
        refs.push(sol.ref);
      }
    }
  }

  // Additional high-signal hadith (chapter openers, well-known narrations)
  // Every entry is a real hadith number verifiable in the corresponding book.
  const EXTRA = [
    "bukhari/1", // Actions by intentions
    "bukhari/2", // What faith is
    "bukhari/6", // Best kind of jihad
    "bukhari/8", // Ties of kinship
    "bukhari/13", // Love for brother what you love for yourself
    "bukhari/52", // Lawful is clear, unlawful is clear
    "bukhari/6018", // Neighbour kindness
    "bukhari/6019", // Do not harm neighbour
    "bukhari/6116", // Whoever believes in Allah + Last Day speaks good or stays silent
    "bukhari/6465", // Best deed is what is done consistently even if small
    "muslim/8", // Jibrīl hadith
    "muslim/34", // Pillars of Islam
    "muslim/55", // Religion is sincere counsel
    "muslim/2564", // Allah looks at hearts and deeds
    "muslim/2586", // Believers are like one body
    "muslim/2699", // Whoever seeks knowledge
    "muslim/2699.1",
    "muslim/223", // Purity is half of faith
  ];
  for (const r of EXTRA)
    if (!seen.has(r)) {
      seen.add(r);
      refs.push(r);
    }

  console.log(`[hadith] fetching ${refs.length} hadiths from backend...`);
  const BACKEND = process.env.BACKEND_URL || "https://api.qurandaily.org";
  for (const ref of refs) {
    const [book, num] = ref.split("/");
    try {
      const res = await fetch(`${BACKEND}/api/hadith/${book}/${encodeURIComponent(num)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(`  skip ${ref} — HTTP ${res.status}`);
        continue;
      }
      const h = await res.json();
      const en = h.translation?.en || Object.values(h.translation || {})[0];
      if (!en) continue;
      const bookName =
        {
          bukhari: "Sahih al-Bukhari",
          muslim: "Sahih Muslim",
          abudawud: "Sunan Abi Dawud",
          tirmidhi: "Jami at-Tirmidhi",
          nasai: "Sunan an-Nasai",
          ibnmajah: "Sunan Ibn Majah",
        }[book] || book;
      rows.push({
        id: `hadith:${book}/${num}`,
        kind: "hadith",
        ref,
        title: `${bookName} #${num}`,
        text: en,
        arabic: h.arabic,
        source: `${bookName} #${num}`,
        href: `/hadith/${book}/${num}`,
      });
    } catch (e) {
      console.warn(`  err on ${ref}: ${e.message}`);
    }
  }
  return rows;
}

// --------- Embedding pipeline ---------

async function embedBatch(texts) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/baai/bge-base-en-v1.5`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texts }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await res.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result.data; // array of 768-dim vectors
}

async function embedRows(rows, state) {
  const BATCH = 20; // bge-base-en handles small batches; keep it modest
  const toDo = rows.filter((r) => !state.done[r.id]);
  console.log(`[embed] ${toDo.length} rows to embed (${rows.length - toDo.length} already done)`);
  let i = 0;
  while (i < toDo.length) {
    const batch = toDo.slice(i, i + BATCH);
    try {
      const vectors = await embedBatch(batch.map((r) => r.text.slice(0, 512)));
      for (let k = 0; k < batch.length; k++) {
        const r = batch[k];
        r.vector = vectors[k];
        state.entries.push(r);
        state.done[r.id] = true;
      }
      i += batch.length;
      if (i % 200 === 0 || i >= toDo.length) {
        saveCkpt(state);
        console.log(`  ...${i}/${toDo.length}`);
      }
    } catch (e) {
      console.warn(`  batch failed at ${i}: ${e.message} — sleeping 4s`);
      await new Promise((r) => setTimeout(r, 4000));
      if (e.message.includes("exceeded") || e.message.includes("quota")) {
        console.error("Neuron quota hit — checkpoint saved, run again tomorrow.");
        saveCkpt(state);
        return;
      }
    }
  }
  saveCkpt(state);
}

// --------- Main ---------

async function main() {
  const state = loadOrEmpty();
  console.log("[init] flattening corpus...");
  const quran = flattenQuran();
  console.log(`  Quran: ${quran.length} ayahs`);
  const duas = flattenDuas();
  console.log(`  Duas: ${duas.length}`);
  const hadith = await flattenHadith();
  console.log(`  Hadith: ${hadith.length} (curated shortlist)`);
  const all = [...quran, ...duas, ...hadith];
  console.log(`[init] total rows: ${all.length}`);

  await embedRows(all, state);

  // Write final corpus (drop the checkpoint's `done` map)
  const finalCorpus = state.entries.filter((r) => r.vector);
  fs.writeFileSync(OUT_PATH, JSON.stringify(finalCorpus));
  const stat = fs.statSync(OUT_PATH);
  console.log(
    `[done] corpus.json — ${finalCorpus.length} entries, ${(stat.size / 1024 / 1024).toFixed(1)} MB`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
