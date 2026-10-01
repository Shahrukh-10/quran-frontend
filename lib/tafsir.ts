import fs from "node:fs";
import path from "node:path";

export type TafsirIntro = {
  surahNumber: number;
  surahSlug: string;
  html: string; // sanitized, static authored HTML (block-level allowed)
  sources: Array<{ label: string; note?: string }>;
};

const TAFSIR_DIR = path.join(process.cwd(), "content", "tafsir");

/**
 * Load an authored tafsir intro for a surah by its slug.
 * Returns null if no file exists. Server-only (sync FS read; runs at
 * build time inside `generateStaticParams`-rendered pages, so zero
 * per-request cost).
 */
export function getTafsirIntroBySlug(slug: string): TafsirIntro | null {
  const file = path.join(TAFSIR_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw) as TafsirIntro;
    if (!data.html || typeof data.html !== "string") return null;
    return data;
  } catch {
    return null;
  }
}
