// Reverts hub — guidance for new Muslims (reverts) and those considering Islam.
//
// Content is intentionally conservative and non-sectarian: it directs the reader
// to their local imam for matters where scholars differ (school of thought,
// specific rulings) and stays with the Quran + Sahih hadith consensus for what
// it does state directly.
//
// Data schema mirrors the duas library — categorized sections with articles that
// carry EN + ID versions and structured references.
import raw from "@/data/reverts/content.json";

export type Reference = {
  type: "quran" | "hadith";
  /** Quran verse "S:A" (or "S:A-B") or hadith citation like "Sahih al-Bukhari 8". */
  ref: string;
};

export type CrossLink = {
  label: { en: string; id: string };
  /** Internal site path — links to existing sections that complete the topic. */
  href: string;
};

export type RevertArticle = {
  slug: string;
  title: { en: string; id: string };
  body: { en: string; id: string };
  references: Reference[];
  linksTo: CrossLink[];
};

export type RevertSection = {
  slug: string;
  title: { en: string; id: string };
  description: { en: string; id: string };
  articles: RevertArticle[];
};

const data = raw as { sections: RevertSection[] };

export function getAllSections(): ReadonlyArray<RevertSection> {
  return data.sections;
}

export function getSection(slug: string): RevertSection | undefined {
  return data.sections.find((s) => s.slug === slug);
}

export function getAllArticles(): ReadonlyArray<{ section: RevertSection; article: RevertArticle }> {
  return data.sections.flatMap((section) =>
    section.articles.map((article) => ({ section, article })),
  );
}

export function getArticle(
  sectionSlug: string,
  articleSlug: string,
): { section: RevertSection; article: RevertArticle } | undefined {
  const section = getSection(sectionSlug);
  if (!section) return undefined;
  const article = section.articles.find((a) => a.slug === articleSlug);
  if (!article) return undefined;
  return { section, article };
}
