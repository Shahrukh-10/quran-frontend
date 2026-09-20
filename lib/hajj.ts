// Hajj & Umrah guide content. Structured like ramadan/reverts: sections → articles.
// Rulings are the majority Sunni position; scholar-differences are noted and the
// reader is directed to their local imam or the Saudi Ministry of Hajj.

import raw from "@/data/hajj/content.json";

export type Reference = { type: "quran" | "hadith"; ref: string };

export type HajjArticle = {
  slug: string;
  title: { en: string; id: string };
  body: { en: string; id: string };
  references: Reference[];
};

export type HajjSection = {
  slug: string;
  title: { en: string; id: string };
  description: { en: string; id: string };
  articles: HajjArticle[];
};

const data = raw as { sections: HajjSection[] };

export function getAllSections(): ReadonlyArray<HajjSection> {
  return data.sections;
}

export function getSection(slug: string): HajjSection | undefined {
  return data.sections.find((s) => s.slug === slug);
}

export function getAllArticles(): ReadonlyArray<{
  section: HajjSection;
  article: HajjArticle;
}> {
  return data.sections.flatMap((section) =>
    section.articles.map((article) => ({ section, article })),
  );
}

export function getArticle(
  slug: string,
): { section: HajjSection; article: HajjArticle } | undefined {
  for (const section of data.sections) {
    const article = section.articles.find((a) => a.slug === slug);
    if (article) return { section, article };
  }
  return undefined;
}
