// Local server-side Quran search. Loads a pre-built 5.6MB index of every ayah's
// Arabic (diacritics-stripped), Sahih Intl translation, Yusuf Ali, Pickthall,
// and transliteration once per Node process.
//
// This is NOT indexed by an FTS engine — for 6,236 rows a plain scan takes
// well under 50ms on any modern machine. If we ever need real relevance
// scoring / stemming, we can drop in fuse.js or a Lunr index against these
// same rows without a re-fetch.

import { getSurahByNumber } from "@/lib/quran";

type SearchRow = {
  key: string; // "s:a"
  s: number; // surah
  k: number; // ayah number
  ar: string; // Arabic uthmani, tashkeel stripped
  tr: string; // Sahih Intl English
  y: string; // Yusuf Ali English
  p: string; // Pickthall English
  t: string; // transliteration (lowercase)
};

let _rows: SearchRow[] | null = null;

async function loadIndex(): Promise<SearchRow[]> {
  if (_rows) return _rows;
  const mod = (await import("@/data/quran/index/search.json")) as { default: SearchRow[] };
  _rows = mod.default;
  return _rows;
}

export type SearchHit = {
  key: string;
  surah: number;
  ayah: number;
  surahName: string;
  surahSlug: string;
  snippet: string; // matched translation, HTML-escaped, with <mark> around match
  field: "arabic" | "translation" | "transliteration" | "reference";
};

// Arabic diacritics — same set used by the indexer. Kept in sync manually.
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

function stripTashkeel(s: string): string {
  return s.replace(ARABIC_DIACRITICS, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, needle: string): string {
  if (!needle) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedNeedle = escapeHtml(needle);
  // Case-insensitive highlight on the escaped version.
  const re = new RegExp(escapeRegex(escapedNeedle), "gi");
  return escaped.replace(re, (m) => `<mark class="bg-accent-muted text-accent">${m}</mark>`);
}

// Try to detect a verse reference in the query, e.g. "2:255", "36:1", "surah 36".
function tryReference(q: string): { s: number; a: number | null } | null {
  const m = q.match(/^\s*(\d{1,3})\s*[:\-\s]\s*(\d{1,3})\s*$/);
  if (m) {
    const s = Number(m[1]);
    const a = Number(m[2]);
    if (s >= 1 && s <= 114 && a >= 1) return { s, a };
  }
  const surahOnly = q.match(/^\s*(?:surah\s+)?(\d{1,3})\s*$/i);
  if (surahOnly) {
    const s = Number(surahOnly[1]);
    if (s >= 1 && s <= 114) return { s, a: null };
  }
  return null;
}

export type SearchOptions = {
  limit?: number;
  language?: "en" | "ar" | "translit" | "any";
};

export async function searchQuran(
  query: string,
  { limit = 50, language = "any" }: SearchOptions = {},
): Promise<{ hits: SearchHit[]; totalMatched: number; language: string; interpretedAs?: string }> {
  const q = query.trim();
  if (!q) return { hits: [], totalMatched: 0, language };

  // Reference shortcut — "2:255" or "36" or "surah 36".
  const ref = tryReference(q);
  if (ref) {
    const surah = getSurahByNumber(ref.s);
    if (surah) {
      const ayah = ref.a ?? 1;
      return {
        hits: [
          {
            key: `${ref.s}:${ayah}`,
            surah: ref.s,
            ayah,
            surahName: surah.name,
            surahSlug: surah.slug,
            snippet: `Jump to <strong>${escapeHtml(surah.name)} ${ref.s}:${ayah}</strong>`,
            field: "reference",
          },
        ],
        totalMatched: 1,
        language,
        interpretedAs: `Verse reference ${ref.s}:${ayah}`,
      };
    }
  }

  const rows = await loadIndex();
  const hits: SearchHit[] = [];
  const isArabic = /[\u0600-\u06FF]/.test(q);
  const needleAr = isArabic ? stripTashkeel(q) : null;
  const needleEn = isArabic ? null : q.toLowerCase();

  for (const row of rows) {
    let matchedIn: SearchHit["field"] | null = null;
    let snippetSource = "";

    if (isArabic && needleAr && (language === "any" || language === "ar")) {
      if (row.ar.includes(needleAr)) {
        matchedIn = "arabic";
        snippetSource = row.ar;
      }
    } else if (needleEn) {
      if (language !== "translit" && language !== "ar") {
        if (row.tr.toLowerCase().includes(needleEn)) {
          matchedIn = "translation";
          snippetSource = row.tr;
        } else if (row.y.toLowerCase().includes(needleEn)) {
          matchedIn = "translation";
          snippetSource = row.y;
        } else if (row.p.toLowerCase().includes(needleEn)) {
          matchedIn = "translation";
          snippetSource = row.p;
        }
      }
      if (!matchedIn && (language === "any" || language === "translit")) {
        if (row.t.includes(needleEn)) {
          matchedIn = "transliteration";
          snippetSource = row.t;
        }
      }
    }

    if (!matchedIn) continue;

    const surah = getSurahByNumber(row.s);
    if (!surah) continue;
    // Windowed snippet so we don't render giant paragraphs.
    const needle = (isArabic ? needleAr : needleEn) ?? "";
    if (!needle) continue;
    const idx = snippetSource.toLowerCase().indexOf(needle.toLowerCase());
    const start = Math.max(0, idx - 60);
    const end = Math.min(snippetSource.length, idx + needle.length + 100);
    const excerpt =
      (start > 0 ? "… " : "") +
      snippetSource.slice(start, end) +
      (end < snippetSource.length ? " …" : "");

    hits.push({
      key: row.key,
      surah: row.s,
      ayah: row.k,
      surahName: surah.name,
      surahSlug: surah.slug,
      snippet: highlight(excerpt, needle),
      field: matchedIn,
    });

    if (hits.length >= limit * 3) break; // over-fetch, then cap after collect
  }

  return {
    hits: hits.slice(0, limit),
    totalMatched: hits.length,
    language,
  };
}
