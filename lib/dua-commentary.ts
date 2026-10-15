import fs from "node:fs";
import path from "node:path";

export type DuaCommentary = {
  duaSlug: string;
  duaCategory: string;
  html: string; // sanitized, static authored HTML (block-level allowed)
  sources: Array<{ label: string; note?: string }>;
};

const DUA_TAFSIR_DIR = path.join(process.cwd(), "content", "tafsir-duas");

/**
 * Load an authored commentary for a dua by its slug.
 * Dua slugs are globally unique across categories in `data/duas/duas.json`
 * (verified at authoring time), so we key files by `<slug>.json` to match
 * the single-slug pattern used by `lib/tafsir.ts`.
 *
 * Returns null if no file exists. Server-only (sync FS read; runs at build
 * time inside `generateStaticParams`-rendered pages, so zero per-request
 * cost).
 */
export function getDuaCommentaryBySlug(slug: string): DuaCommentary | null {
  const file = path.join(DUA_TAFSIR_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw) as DuaCommentary;
    if (!data.html || typeof data.html !== "string") return null;
    return data;
  } catch {
    return null;
  }
}
