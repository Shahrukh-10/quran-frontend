// 99 Names of Allah — Asma ul Husna.
// Data authored from well-attested Islamic sources; each entry includes at least one
// Quranic reference where possible. Do not modify the Arabic — reviewed reference set.

import namesRaw from "@/data/names.json";

export type DivineName = {
  order: number; // 1..99
  slug: string;
  arabic: string;
  transliteration: string;
  meaning: { en: string; id: string };
  reflection: { en: string; id: string };
  quranicRef?: string; // e.g. "59:22" — where the name appears in the Quran
};

export function getAllNames(): ReadonlyArray<DivineName> {
  return namesRaw as DivineName[];
}

export function getName(slug: string): DivineName | undefined {
  return (namesRaw as DivineName[]).find((n) => n.slug === slug);
}
