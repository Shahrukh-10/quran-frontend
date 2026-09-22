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

// Google Sitemap Guidelines (https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview):
//   - Max 50,000 URLs and 50 MB per file — under the limit here for now
//     (roughly 40k), but the ayah section alone will grow with translations
//     so we shard by content type below and expose a sitemap index at the
//     canonical /sitemap.xml (Next.js does this automatically when
//     generateSitemaps() returns multiple ids).
//   - Only lastmod is a strong signal to Google (changefreq and priority
//     are ignored). We stamp lastmod once per build from NEXT_PUBLIC_BUILD_DATE
//     so freshness reflects the actual deploy, not the request time.
//   - xhtml:hreflang alternates are included on every URL because Google
//     will refuse to link locale variants together without them.

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

// Shard the sitemap into logically-scoped sub-sitemaps. Google prefers this
// pattern (one section per file) so re-crawling and Search Console coverage
// reports stay actionable at scale. Order matters: id 0 must always exist.
type Shard = "core" | "quran" | "hadith" | "duas" | "cities" | "figures" | "names" | "salah";
const SHARDS: Shard[] = ["core", "quran", "duas", "cities", "figures", "names", "salah"];

export function generateSitemaps() {
  return SHARDS.map((_, i) => ({ id: i }));
}

function nowStamp(): string {
  // Prefer the build-time stamp injected by CI so all URLs share one freshness
  // signal per deploy (not per-request).
  return process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
}

function withHreflang(path: string, priority: number, lastmod: string): MetadataRoute.Sitemap[number] {
  return {
    url: siteUrl(path),
    lastModified: lastmod,
    priority,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [
          l,
          siteUrl(l === routing.defaultLocale ? path : `/${l}${path === "/" ? "" : path}`),
        ]),
      ),
    },
  };
}

function pushLocaleVariants(
  entries: MetadataRoute.Sitemap,
  path: string,
  priority: number,
  lastmod: string,
) {
  entries.push(withHreflang(path, priority, lastmod));
  for (const locale of locales) {
    if (locale === routing.defaultLocale) continue;
    entries.push({
      url: siteUrl(`/${locale}${path === "/" ? "" : path}`),
      lastModified: lastmod,
      priority: Math.max(0.4, priority - 0.1),
    });
  }
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const now = nowStamp();
  const shard = SHARDS[id];
  const entries: MetadataRoute.Sitemap = [];

  switch (shard) {
    case "core":
      for (const p of topLevel) pushLocaleVariants(entries, p, p === "/" ? 1 : 0.7, now);
      break;

    case "quran":
      for (const s of getAllSurahs()) {
        pushLocaleVariants(entries, `/quran/${s.slug}`, 0.8, now);
        for (let n = 1; n <= s.ayahCount; n++) {
          pushLocaleVariants(entries, `/quran/${s.slug}/${n}`, 0.6, now);
        }
      }
      break;

    case "duas":
      for (const c of getAllCategories()) pushLocaleVariants(entries, `/duas/${c.slug}`, 0.7, now);
      for (const d of getAllDuas()) pushLocaleVariants(entries, `/duas/${d.category}/${d.slug}`, 0.6, now);
      break;

    case "cities":
      for (const city of CITIES) pushLocaleVariants(entries, `/prayer-times/${city.slug}`, 0.65, now);
      break;

    case "figures":
      for (const f of getAllFigures()) pushLocaleVariants(entries, `/learn/${f.slug}`, 0.7, now);
      break;

    case "names":
      for (const n of getAllNames()) pushLocaleVariants(entries, `/names-of-allah/${n.slug}`, 0.6, now);
      break;

    case "salah":
      for (const tut of getAllSalahTutorials()) pushLocaleVariants(entries, `/learn-salah/${tut.slug}`, 0.7, now);
      break;
  }

  return entries;
}
