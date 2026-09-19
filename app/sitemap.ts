import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { CITIES } from "@/lib/cities";
import { getAllCategories, getAllDuas } from "@/lib/duas";
import { getAllFigures } from "@/lib/figures";
import { getAllNames } from "@/lib/names";
import { getAllSurahs } from "@/lib/quran";
import { getAllSalahTutorials } from "@/lib/salah";
import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

// Every SSG-produced route belongs here. Alternates emit hreflang per locale.

const topLevel = [
  "/",
  "/about",
  "/sources",
  "/privacy",
  "/settings",
  "/quran",
  "/mushaf",
  "/duas",
  "/prayer-times",
  "/qibla",
  "/learn-salah",
  "/learn",
  "/names-of-allah",
  "/calendar",
  "/adhan",
  "/tools",
  "/tools/tasbih",
  "/tools/prayer-tracker",
  "/tools/zakat",
  "/tools/adhkar",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const entries: MetadataRoute.Sitemap = [];

  const push = (
    path: string,
    priority: number,
    changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  ) => {
    entries.push({
      url: siteUrl(path),
      lastModified: now,
      changeFrequency: changeFreq,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [
            l,
            siteUrl(l === routing.defaultLocale ? path : `/${l}${path === "/" ? "" : path}`),
          ]),
        ),
      },
    });
    for (const locale of locales) {
      if (locale === routing.defaultLocale) continue;
      entries.push({
        url: siteUrl(`/${locale}${path === "/" ? "" : path}`),
        lastModified: now,
        changeFrequency: changeFreq,
        priority: Math.max(0.4, priority - 0.1),
      });
    }
  };

  for (const p of topLevel) push(p, p === "/" ? 1 : 0.7);

  // Every surah is its own page.
  for (const s of getAllSurahs()) {
    push(`/quran/${s.slug}`, 0.8);
    // Every ayah is its own page — 6,236 entries. Google splits huge sitemaps; keeping
    // them here works because MetadataRoute.Sitemap batches. If we hit the 50k URL/50MB
    // limit, split via app/sitemap/[shard]/route.ts.
    for (let n = 1; n <= s.ayahCount; n++) {
      push(`/quran/${s.slug}/${n}`, 0.6, "monthly");
    }
  }

  for (const c of getAllCategories()) push(`/duas/${c.slug}`, 0.7);
  for (const d of getAllDuas()) push(`/duas/${d.category}/${d.slug}`, 0.6);
  for (const n of getAllNames()) push(`/names-of-allah/${n.slug}`, 0.6);
  for (const tut of getAllSalahTutorials()) push(`/learn-salah/${tut.slug}`, 0.7);
  for (const f of getAllFigures()) push(`/learn/${f.slug}`, 0.7);
  for (const city of CITIES) push(`/prayer-times/${city.slug}`, 0.65);

  return entries;
}
