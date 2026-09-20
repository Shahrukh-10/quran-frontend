// Seerah timeline — life of the Prophet Muhammad ﷺ.
// Content sourced from Ar-Raheeq al-Makhtum (Mubarakpuri) and Ibn Hisham's
// Sirat Rasul Allah, cross-referenced with Sahih hadith. See data/seerah/timeline.json.

import raw from "@/data/seerah/timeline.json";

export type SeerahEra = {
  slug: string;
  name: { en: string; id: string };
  description: { en: string; id: string };
};

export type SeerahReference = {
  type: "quran" | "hadith";
  /** Quran verse "S:A" or "S:A-B", or hadith citation like "Sahih al-Bukhari 3". */
  ref: string;
};

export type SeerahEvent = {
  slug: string;
  era: string;
  year: {
    /** After Hijrah year — negative values are pre-Hijrah. */
    ah: number;
    /** Common Era, e.g. "610 CE". */
    ce: string;
    /** Optional month/day note. */
    note?: string;
  };
  title: { en: string; id: string };
  location: string;
  description: { en: string; id: string };
  references?: SeerahReference[];
};

const data = raw as { eras: SeerahEra[]; events: SeerahEvent[] };

export function getAllEras(): ReadonlyArray<SeerahEra> {
  return data.eras;
}

export function getEra(slug: string): SeerahEra | undefined {
  return data.eras.find((e) => e.slug === slug);
}

export function getAllEvents(): ReadonlyArray<SeerahEvent> {
  return data.events;
}

export function getEvent(slug: string): SeerahEvent | undefined {
  return data.events.find((e) => e.slug === slug);
}

export function getEventsByEra(eraSlug: string): ReadonlyArray<SeerahEvent> {
  return data.events.filter((e) => e.era === eraSlug);
}

/**
 * Events sorted chronologically. Pre-Hijrah events have negative AH years
 * (e.g. birth ah=-53, first revelation ah=-13); Hijrah is ah=1.
 */
export function getEventsChronological(): ReadonlyArray<SeerahEvent> {
  return [...data.events].sort((a, b) => a.year.ah - b.year.ah);
}
