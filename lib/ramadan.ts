// Ramadan-aware helpers on top of lib/hijri.
//
// Ramadan is Hijri month 9. This module answers the questions the hub UI
// needs: "is today in Ramadan?", "what day of Ramadan is it?", "when does
// this year's Ramadan start/end?", plus the 30-day date range used to
// render the fasting tracker grid.

import raw from "@/data/ramadan/content.json";
import { gregorianToHijri, hijriToGregorian } from "@/lib/hijri";

export type RamadanState = {
  /** True if the current Gregorian date falls within Hijri month 9. */
  active: boolean;
  /** Current Hijri year (e.g. 1446). */
  hijriYear: number;
  /** 1-30 if `active`; null otherwise. */
  dayOfRamadan: number | null;
  /** Days until Ramadan begins, 0 if we're in Ramadan or Shawwal 1. */
  daysUntilRamadan: number;
  /** Gregorian dates (yyyy-mm-dd) for each of the 30 days of the CURRENT Hijri year's Ramadan. */
  ramadanDates: string[];
  /** Ramadan start Gregorian date for the current Hijri year. */
  startISO: string;
  /** Ramadan end (day 30 approx — Ramadan can be 29 days) Gregorian date. */
  endISO: string;
};

function isoDate(gy: number, gm: number, gd: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/**
 * Compute Ramadan state relative to a given date. Pure function — pass in a
 * Date and get a static snapshot. Suitable for both server render and client
 * refresh (client should recompute on hydration to get today's actual date).
 */
export function getRamadanState(now: Date = new Date()): RamadanState {
  const today = gregorianToHijri(now);
  // The "Ramadan year" we care about: if we're past Ramadan for the current
  // Hijri year, look at next Hijri year's Ramadan.
  const ramadanYear =
    today.hm > 9 || (today.hm === 9 && today.hd > 30) ? today.hy + 1 : today.hy;

  // Compute all 30 Gregorian dates of this Ramadan.
  const dates: string[] = [];
  for (let d = 1; d <= 30; d++) {
    const g = hijriToGregorian(ramadanYear, 9, d);
    dates.push(isoDate(g.gy, g.gm, g.gd));
  }

  const active = today.hy === ramadanYear && today.hm === 9;
  const dayOfRamadan = active ? today.hd : null;

  // Days until Ramadan: diff between today and Ramadan day 1.
  const day1 = hijriToGregorian(ramadanYear, 9, 1);
  const day1Date = new Date(day1.gy, day1.gm - 1, day1.gd);
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntilRamadan = active
    ? 0
    : Math.max(0, Math.round((day1Date.getTime() - todayZero.getTime()) / 86_400_000));

  return {
    active,
    hijriYear: ramadanYear,
    dayOfRamadan,
    daysUntilRamadan,
    ramadanDates: dates,
    startISO: dates[0] ?? "",
    endISO: dates[dates.length - 1] ?? "",
  };
}

// -------- Content model --------

export type Reference = { type: "quran" | "hadith"; ref: string };

export type RamadanArticle = {
  slug: string;
  title: { en: string; id: string };
  body: { en: string; id: string };
  references: Reference[];
};

export type RamadanSection = {
  slug: string;
  title: { en: string; id: string };
  articles: RamadanArticle[];
};

const data = raw as { sections: RamadanSection[] };

export function getAllSections(): ReadonlyArray<RamadanSection> {
  return data.sections;
}

export function getAllArticles(): ReadonlyArray<{
  section: RamadanSection;
  article: RamadanArticle;
}> {
  return data.sections.flatMap((section) =>
    section.articles.map((article) => ({ section, article })),
  );
}

export function getArticle(
  slug: string,
): { section: RamadanSection; article: RamadanArticle } | undefined {
  for (const section of data.sections) {
    const article = section.articles.find((a) => a.slug === slug);
    if (article) return { section, article };
  }
  return undefined;
}
