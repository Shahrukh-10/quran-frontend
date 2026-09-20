#!/usr/bin/env tsx
/**
 * pnpm fetch:hadith — pull the full Kutub as-Sittah corpus from Fawaz Ahmed's
 * public hadith dataset and store it under data/hadith/<book>/, bucketed
 * by 100 hadiths per file so a single dua/hadith detail page never loads
 * a 5 MB blob.
 *
 * Skips books/buckets that already exist — safe to re-run. To force refresh,
 * `rm -rf data/hadith/<book>` then re-run.
 *
 * Data license: https://github.com/fawazahmed0/hadith-api (MIT).
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { HADITH_BOOKS } from "../lib/hadith";

const DATA_ROOT = join(process.cwd(), "data", "hadith");
const CDN_ROOT = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";
const BUCKET_SIZE = 100;

type RawHadith = {
  hadithnumber: number;
  arabicnumber?: number;
  text: string;
  grades?: Array<{ name: string; grade: string }>;
  reference?: { book?: number; hadith?: number };
};
type RawEdition = { metadata?: { name?: string }; hadiths: RawHadith[] };

async function fetchEdition(slug: string): Promise<RawEdition> {
  const url = `${CDN_ROOT}/${slug}.min.json`;
  console.log(`  fetching ${slug} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${slug}: ${res.status}`);
  return (await res.json()) as RawEdition;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function processBook(bookSlug: string, apiSlug: string): Promise<void> {
  const outDir = join(DATA_ROOT, bookSlug);
  await mkdir(outDir, { recursive: true });

  // Fetch three editions in parallel: Arabic + English + Indonesian.
  const [ara, eng, ind] = await Promise.all([
    fetchEdition(`ara-${apiSlug}`),
    fetchEdition(`eng-${apiSlug}`),
    fetchEdition(`ind-${apiSlug}`).catch(() => null),
  ]);

  // Index by hadith number.
  const byNumber = new Map<number, RawHadith>();
  for (const h of ara.hadiths) byNumber.set(h.hadithnumber, h);
  const engByNumber = new Map<number, RawHadith>();
  for (const h of eng.hadiths) engByNumber.set(h.hadithnumber, h);
  const indByNumber = new Map<number, RawHadith>();
  if (ind) for (const h of ind.hadiths) indByNumber.set(h.hadithnumber, h);

  // Group into buckets.
  const buckets = new Map<number, Array<{
    book: string;
    number: number;
    section: number;
    arabic: string;
    translation: { en: string; id: string };
    grade?: string;
  }>>();
  for (const [n, ar] of byNumber) {
    const bucket = Math.floor((n - 1) / BUCKET_SIZE) * BUCKET_SIZE + 1;
    const en = engByNumber.get(n);
    const id = indByNumber.get(n);
    const arr = buckets.get(bucket) ?? [];
    arr.push({
      book: bookSlug,
      number: n,
      section: ar.reference?.book ?? 0,
      arabic: ar.text,
      translation: {
        en: en?.text ?? "",
        // Indonesian fallback: some entries missing; leave empty, English still there.
        id: id?.text ?? "",
      },
      grade: ar.grades?.[0]?.grade,
    });
    buckets.set(bucket, arr);
  }

  // Write each bucket file if missing.
  let written = 0;
  let skipped = 0;
  for (const [bucket, hadiths] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const outFile = join(outDir, `${bucket}.json`);
    if (await fileExists(outFile)) {
      skipped++;
      continue;
    }
    hadiths.sort((a, b) => a.number - b.number);
    await writeFile(outFile, JSON.stringify({ hadiths }, null, 0));
    written++;
  }
  console.log(`  ${bookSlug}: ${written} buckets written, ${skipped} skipped`);
}

async function main(): Promise<void> {
  console.log(`Fetching hadith corpus into ${DATA_ROOT}`);
  await mkdir(DATA_ROOT, { recursive: true });
  for (const book of HADITH_BOOKS) {
    console.log(`\n[${book.slug}] ${book.name.en}`);
    try {
      await processBook(book.slug, book.apiSlug);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("\nDone. Run `pnpm build` to statically generate hadith pages.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
