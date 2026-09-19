// Dua content is authored in-repo. Structure mirrors what MDX would have given us
// (frontmatter + body), but plain JSON keeps runtime lean. Every dua MUST have a
// `source` and, where applicable, `grading` — CLAUDE.md rule #4.

import duasRaw from "@/data/duas/duas.json";

export type Grading =
  | "Quran"
  | "Sahih al-Bukhari"
  | "Sahih Muslim"
  | "Sunan Abu Dawud"
  | "Sunan at-Tirmidhi"
  | "Sunan an-Nasa'i"
  | "Sunan Ibn Majah"
  | "Musnad Ahmad"
  | "Hisnul Muslim";

export type Dua = {
  slug: string;
  category: string; // matches DuaCategory.slug
  title: Record<"en" | "id", string>;
  arabic: string;
  transliteration: string;
  translation: Record<"en" | "id", string>;
  when: Record<"en" | "id", string>;
  source: string; // narration citation
  grading?: Grading; // classification if from hadith (not needed for Quran)
  reference?: string; // Quran ref (e.g. "2:201") or hadith number
};

export type DuaCategory = {
  slug: string;
  title: Record<"en" | "id", string>;
  description: Record<"en" | "id", string>;
};

const raw = duasRaw as { categories: DuaCategory[]; duas: Dua[] };

export function getAllCategories(): ReadonlyArray<DuaCategory> {
  return raw.categories;
}

export function getCategory(slug: string): DuaCategory | undefined {
  return raw.categories.find((c) => c.slug === slug);
}

export function getAllDuas(): ReadonlyArray<Dua> {
  return raw.duas;
}

export function getDuasInCategory(catSlug: string): ReadonlyArray<Dua> {
  return raw.duas.filter((d) => d.category === catSlug);
}

export function getDua(catSlug: string, duaSlug: string): Dua | undefined {
  return raw.duas.find((d) => d.category === catSlug && d.slug === duaSlug);
}
