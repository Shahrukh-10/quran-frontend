/**
 * Problem→solution situations graph — BETA.
 *
 * SAFETY: every entry in `data/graph/situations.json` cites its source. This
 * loader validates at import time that every `ref` resolves to real content
 * we ship. If a ref is broken the situation is DROPPED so users never see
 * an unresolvable citation. If you're seeing fewer situations than expected
 * on the page, check the console — `validateSituations()` logs each drop.
 *
 * NOT a fatwā. NOT a substitute for a scholar. This is a study aid.
 */

import raw from "@/data/graph/situations.json";
import { getDua as getDuaEntry } from "@/lib/duas";

export type Solution = {
  type: "dua" | "ayah" | "page";
  ref: string;
  reason: string;
};

export type Situation = {
  id: string;
  labels: string[];
  solutions: Solution[];
};

type Root = {
  _meta?: unknown;
  situations: Array<{
    id: string;
    labels: string[];
    solutions: Array<{ type: string; ref: string; reason: string }>;
  }>;
};

const root = raw as Root;

/** Resolve a dua ref of the form "category/slug" against duas.json. */
function resolveDua(ref: string): { title: string; slug: string; source?: string } | null {
  const [category, slug] = ref.split("/");
  if (!category || !slug) return null;
  const d = getDuaEntry(category, slug);
  if (!d) return null;
  return { title: d.title.en, slug: `${category}/${slug}`, source: d.source };
}

/** Ayah refs are verse-keys like "2:255". Basic shape check + surah range. */
function resolveAyah(ref: string): boolean {
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(ref);
  if (!m || !m[1] || !m[2]) return false;
  const surah = Number(m[1]);
  const ayah = Number(m[2]);
  return surah >= 1 && surah <= 114 && ayah >= 1;
}

/** Static route refs — hard-coded whitelist of real pages we ship. */
const KNOWN_PAGES = new Set<string>([
  "/quran",
  "/duas",
  "/hadith",
  "/prayer-times",
  "/qibla",
  "/learn-salah",
  "/names-of-allah",
  "/calendar",
  "/tools/tasbih",
  "/tools/zakat",
  "/tools/adhkar",
  "/tools/prayer-tracker",
  "/ramadan",
  "/hajj",
  "/seerah",
  "/reverts",
  "/memorize",
  "/iqamah",
  "/quran/download",
  "/find-guidance",
]);

function resolvePage(ref: string): boolean {
  return KNOWN_PAGES.has(ref);
}

/** Validate and load. Drops any situation whose solutions all fail to resolve;
 *  drops individual solutions that don't resolve but keeps the situation if
 *  at least one solution survives. Logs everything in dev. */
function loadValidatedSituations(): Situation[] {
  const out: Situation[] = [];
  for (const raw of root.situations) {
    const kept: Solution[] = [];
    for (const s of raw.solutions) {
      let ok = false;
      if (s.type === "dua") ok = resolveDua(s.ref) !== null;
      else if (s.type === "ayah") ok = resolveAyah(s.ref);
      else if (s.type === "page") ok = resolvePage(s.ref);
      if (ok) {
        kept.push({ type: s.type as Solution["type"], ref: s.ref, reason: s.reason });
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`[situations] dropped unresolved ref: ${raw.id} → ${s.type}:${s.ref}`);
      }
    }
    if (kept.length > 0) {
      out.push({ id: raw.id, labels: raw.labels, solutions: kept });
    } else if (process.env.NODE_ENV !== "production") {
      console.warn(`[situations] dropped empty situation: ${raw.id}`);
    }
  }
  return out;
}

const SITUATIONS = loadValidatedSituations();

/** Public read-only accessor. */
export function getAllSituations(): ReadonlyArray<Situation> {
  return SITUATIONS;
}

/** URL for a solution ref — resolves to an existing page on this site. */
export function solutionHref(s: Solution): string {
  if (s.type === "dua") return `/duas/${s.ref}`;
  if (s.type === "ayah") {
    const [surah, ayah] = s.ref.split(":");
    return `/quran/${surah}/${ayah}`;
  }
  return s.ref;
}

/** Get display metadata for a solution — used by the UI cards to show
 *  Arabic, translation, and citation without re-fetching. */
export type SolutionCardData = {
  title: string;
  href: string;
  source?: string;
  arabic?: string;
  translation?: string;
  reason: string;
  type: Solution["type"];
  ref: string;
};

// Loader for dua card data (called from server components).
export function getSolutionCard(s: Solution): SolutionCardData {
  if (s.type === "dua") {
    const [category, slug] = s.ref.split("/");
    if (!category || !slug) {
      return { title: s.ref, href: solutionHref(s), reason: s.reason, type: s.type, ref: s.ref };
    }
    const d = getDuaEntry(category, slug);
    return {
      title: d?.title.en ?? s.ref,
      href: solutionHref(s),
      source: d?.source,
      arabic: d?.arabic,
      translation: d?.translation.en,
      reason: s.reason,
      type: s.type,
      ref: s.ref,
    };
  }
  if (s.type === "ayah") {
    return {
      title: `Quran ${s.ref}`,
      href: solutionHref(s),
      source: `Quran ${s.ref}`,
      reason: s.reason,
      type: s.type,
      ref: s.ref,
    };
  }
  return {
    title: s.ref,
    href: solutionHref(s),
    reason: s.reason,
    type: s.type,
    ref: s.ref,
  };
}

/** Keyword-based fuzzy matching. Splits the user query into tokens, then
 *  scores each situation by counting how many labels contain a query token
 *  as a substring. Deterministic, no LLM, works offline.
 *
 *  Returns the top-N situations sorted by score desc. Empty array for
 *  queries that don't match anything. */
export function searchSituations(query: string, limit = 5): Situation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/[\s,.:;!?()[\]"'/\\-]+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return [];

  const scored: Array<{ s: Situation; score: number }> = [];
  for (const s of SITUATIONS) {
    let score = 0;
    for (const label of s.labels) {
      const l = label.toLowerCase();
      for (const t of tokens) {
        // full-token containment is worth more than substring
        if (l === t) score += 5;
        else if (l.includes(t)) score += 3;
        else if (t.includes(l) && l.length >= 4) score += 2;
      }
    }
    if (score > 0) scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.s);
}
