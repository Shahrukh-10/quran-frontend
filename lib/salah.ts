// Salah tutorial content. Each topic is a HowTo — steps-based, structured for the
// HowTo schema (docs/ARCHITECTURE.md §SEO). Body kept in-repo, plain JSON.

import tutorialsRaw from "@/data/salah/tutorials.json";

export type SalahStep = {
  title: { en: string; id: string };
  body: { en: string; id: string };
};

export type SalahTutorial = {
  slug: string;
  category: "obligatory" | "sunnah" | "occasional";
  order: number;
  title: { en: string; id: string };
  summary: { en: string; id: string };
  rakats?: number;
  when: { en: string; id: string };
  steps: SalahStep[];
  duas?: Array<{
    arabic: string;
    transliteration: string;
    translation: { en: string; id: string };
    note?: { en: string; id: string };
  }>;
  notes?: { en: string[]; id: string[] };
};

export function getAllSalahTutorials(): ReadonlyArray<SalahTutorial> {
  return (tutorialsRaw as SalahTutorial[]).slice().sort((a, b) => a.order - b.order);
}

export function getSalahTutorial(slug: string): SalahTutorial | undefined {
  return (tutorialsRaw as SalahTutorial[]).find((t) => t.slug === slug);
}
