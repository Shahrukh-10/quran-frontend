// Hijri conversion using the hijri-converter package (pure JS, no API).

import { toGregorian, toHijri } from "hijri-converter";

export type HijriDate = { hy: number; hm: number; hd: number };
export type GregDate = { gy: number; gm: number; gd: number };

export function gregorianToHijri(d: Date): HijriDate {
  const { hy, hm, hd } = toHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { hy, hm, hd };
}

export function hijriToGregorian(hy: number, hm: number, hd: number): GregDate {
  const { gy, gm, gd } = toGregorian(hy, hm, hd);
  return { gy, gm, gd };
}

// Approximate Islamic dates (day of Hijri month). Not exhaustive — the community
// verifies the actual dates with moon-sighting each year.
export type IslamicEvent = { hm: number; hd: number; slug: string; en: string; id: string };
export const ISLAMIC_EVENTS: ReadonlyArray<IslamicEvent> = [
  { hm: 1, hd: 1, slug: "hijri-new-year", en: "Islamic New Year", id: "Tahun Baru Hijriah" },
  { hm: 1, hd: 10, slug: "ashura", en: "Day of Ashura", id: "Hari Asyura" },
  {
    hm: 3,
    hd: 12,
    slug: "mawlid",
    en: "Mawlid (Prophet's birthday, observed)",
    id: "Maulid Nabi (peringatan)",
  },
  {
    hm: 7,
    hd: 27,
    slug: "isra-miraj",
    en: "Isra and Mi'raj (observed)",
    id: "Isra Mikraj (peringatan)",
  },
  { hm: 8, hd: 15, slug: "nisf-shaban", en: "Nisf Sha'ban", id: "Nisfu Sya'ban" },
  { hm: 9, hd: 1, slug: "ramadan-begins", en: "Ramadan begins", id: "Awal Ramadan" },
  {
    hm: 9,
    hd: 21,
    slug: "laylat-al-qadr-window",
    en: "Laylat al-Qadr (odd nights of last 10)",
    id: "Lailatul Qadar (malam ganjil 10 terakhir)",
  },
  { hm: 10, hd: 1, slug: "eid-al-fitr", en: "Eid al-Fitr", id: "Idul Fitri" },
  { hm: 12, hd: 8, slug: "hajj-begins", en: "Hajj begins", id: "Haji dimulai" },
  { hm: 12, hd: 9, slug: "arafah", en: "Day of Arafah", id: "Hari Arafah" },
  { hm: 12, hd: 10, slug: "eid-al-adha", en: "Eid al-Adha", id: "Idul Adha" },
];

export const HIJRI_MONTHS: ReadonlyArray<string> = [
  "Muharram",
  "Safar",
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  "Jumada al-Awwal",
  "Jumada al-Thani",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qi'dah",
  "Dhu al-Hijjah",
];
