// Sunnah-of-the-day picker. Deterministic — same output for everyone on the
// same UTC date, so the whole ummah sees the same Sunnah at the same time.
//
// Data model favors variety: each entry has a category tag (dhikr, character,
// salah, food, sleep, hygiene, quran, charity, fasting) so the modulo picker
// naturally rotates through practice areas over 30 days.
//
// Content is sourced from Sahih hadith. If you add entries, cite the source.

import raw from "@/data/sunnah/daily.json";

export type Sunnah = {
  slug: string;
  category: string;
  title: { en: string; id: string };
  /** Arabic dhikr if applicable; null for behaviour-only Sunnahs. */
  arabic: string | null;
  transliteration: string | null;
  translation: { en: string; id: string } | null;
  body: { en: string; id: string };
  source: string;
};

const data = raw as { sunnahs: Sunnah[] };

/**
 * Day-of-year for a given UTC date (1-366). Independent of timezone —
 * everyone worldwide gets the same daily Sunnah once the UTC date has flipped.
 */
function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86_400_000) + 1;
}

export function getSunnahOfTheDay(now: Date = new Date()): Sunnah {
  const idx = (dayOfYearUTC(now) - 1) % data.sunnahs.length;
  // Safe because we control the array and it's non-empty.
  return data.sunnahs[idx] as Sunnah;
}

export function getAllSunnahs(): ReadonlyArray<Sunnah> {
  return data.sunnahs;
}
