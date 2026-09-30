import { statSync } from "node:fs";
import path from "node:path";
import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { CITIES } from "@/lib/cities";
import { getAllCategories, getAllDuas } from "@/lib/duas";
import { getAllFigures } from "@/lib/figures";
import { getAllNames } from "@/lib/names";
import { getAllSurahs } from "@/lib/quran";
import { getAllSalahTutorials } from "@/lib/salah";
import { siteUrl } from "@/lib/site";

// Per-content-type sitemap shards — /sitemaps/<shard>.xml
//
// Referenced by the sitemap index at /sitemap.xml. Each shard is a
// standard <urlset> with <loc> + <lastmod> only (Google ignores
// <changefreq> and <priority>).
//
// We DO emit xhtml:hreflang alternates per-URL because Google needs those
// to link the 6 locale variants together and pick the right one per user.

export const dynamic = "force-static";
export const revalidate = false;

const TOP_LEVEL = [
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
  "/blog",
];

const HADITH_BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"];

const SHARDS = [
  "core",
  "quran",
  "hadith",
  "duas",
  "cities",
  "names",
  "salah",
  "figures",
  "blog",
] as const;
type Shard = (typeof SHARDS)[number];

// Locales that ship English metadata + English body content (only chrome
// translated). These are `noindex` at the layout level via `robotsForLocale`,
// so they must NOT appear in the sitemap or hreflang alternates — advertising
// noindex URLs wastes crawl budget and misuses hreflang.
//
// `id` (Indonesian) is exempt: real Indonesian ayah translation exists.
// Restore a locale here when its metadata + body content actually ship
// translated.
const UNTRANSLATED_LOCALES = new Set(["ar", "ur", "tr", "fr"]);
const INDEXABLE_LOCALES = locales.filter((l) => !UNTRANSLATED_LOCALES.has(l));

// ---------------------------------------------------------------------------
// Per-URL <lastmod> from source-data mtimes
// ---------------------------------------------------------------------------
// Google mostly ignores <changefreq> and <priority>, but it DOES honour
// <lastmod> — if every URL emits the same date, Google reads that as
// "nothing changed" and slows re-crawl. We derive per-URL lastmod from the
// mtime of the underlying JSON data files. Fallback to BUILD_DATE if a file
// isn't found (defensive — shouldn't happen).
//
// All lookups happen at module load time so we're not hitting the FS per
// request.

const REPO_ROOT = path.resolve(process.cwd());
const BUILD_DATE_FALLBACK =
  process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

function safeMtime(relPath: string): string {
  try {
    const abs = path.join(REPO_ROOT, relPath);
    const stat = statSync(abs);
    return stat.mtime.toISOString().slice(0, 10);
  } catch {
    return BUILD_DATE_FALLBACK;
  }
}

// mtime of a single per-surah data file
function surahMtime(surahNumber: number): string {
  return safeMtime(`data/quran/surahs/${surahNumber}.json`);
}

// aggregate mtime across a set of files → max of the individual mtimes
function aggregateMtime(relPaths: string[]): string {
  let best = "1970-01-01";
  for (const rel of relPaths) {
    const m = safeMtime(rel);
    if (m > best) best = m;
  }
  return best === "1970-01-01" ? BUILD_DATE_FALLBACK : best;
}

// Precomputed once per module load
const SURAH_MTIMES: Record<number, string> = {};
for (const s of getAllSurahs()) {
  SURAH_MTIMES[s.number] = surahMtime(s.number);
}
const ALL_SURAHS_MTIME = aggregateMtime(
  Object.keys(SURAH_MTIMES).map((n) => `data/quran/surahs/${n}.json`),
);
const DUAS_MTIME = safeMtime("data/duas/duas.json");
const NAMES_MTIME = safeMtime("data/names.json");
const CITIES_MTIME = safeMtime("lib/cities.ts");
const SALAH_MTIME = safeMtime("data/salah/tutorials.json");
const FIGURES_MTIME = safeMtime("lib/figures.ts");
const HADITH_MTIME = safeMtime("lib/hadith.ts");
const QURAN_META_MTIME = safeMtime("data/quran/surahs.json");
const BLOG_MTIME = safeMtime("lib/blog.ts");

// Site-wide "top" lastmod = max of everything, used for top-level chrome URLs
const SITE_TOP_MTIME = aggregateMtime([
  "data/quran/surahs.json",
  "data/duas/duas.json",
  "data/names.json",
  "data/salah/tutorials.json",
  "lib/cities.ts",
  "lib/figures.ts",
  "lib/hadith.ts",
]);

// Return the lastmod for a given URL path (default-locale form, e.g. "/quran/al-fatihah/5")
function lastmodForPath(p: string): string {
  if (p === "/" || p === "/about" || p === "/sources" || p === "/privacy" || p === "/settings") {
    return SITE_TOP_MTIME;
  }
  // Quran surah + ayah
  const surahAyah = p.match(/^\/quran\/([^/]+)(?:\/(\d+))?$/);
  if (surahAyah) {
    const slug = surahAyah[1];
    const surah = getAllSurahs().find((s) => s.slug === slug);
    if (surah) return SURAH_MTIMES[surah.number] ?? ALL_SURAHS_MTIME;
    return ALL_SURAHS_MTIME;
  }
  if (p === "/quran" || p === "/mushaf") return ALL_SURAHS_MTIME;
  // Duas
  if (p === "/duas" || p.startsWith("/duas/")) return DUAS_MTIME;
  // Names of Allah
  if (p === "/names-of-allah" || p.startsWith("/names-of-allah/")) return NAMES_MTIME;
  // Prayer times / cities
  if (p === "/prayer-times" || p.startsWith("/prayer-times/")) return CITIES_MTIME;
  // Salah tutorials
  if (p === "/learn-salah" || p.startsWith("/learn-salah/")) return SALAH_MTIME;
  // Figures / learn
  if (p === "/learn" || p.startsWith("/learn/")) return FIGURES_MTIME;
  // Hadith
  if (p === "/hadith" || p.startsWith("/hadith/")) return HADITH_MTIME;
  // Blog
  if (p === "/blog" || p.startsWith("/blog/")) return BLOG_MTIME;
  // Everything else — tools, adhan, qibla, calendar
  return SITE_TOP_MTIME;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

// generateStaticParams — pre-render each shard at build time
export function generateStaticParams() {
  return SHARDS.map((shard) => ({ shard: `${shard}.xml` }));
}

function buildPaths(shard: Shard): string[] {
  const paths: string[] = [];
  switch (shard) {
    case "core":
      paths.push(...TOP_LEVEL);
      break;
    case "quran":
      for (const s of getAllSurahs()) {
        paths.push(`/quran/${s.slug}`);
        for (let n = 1; n <= s.ayahCount; n++) {
          paths.push(`/quran/${s.slug}/${n}`);
        }
      }
      break;
    case "hadith":
      paths.push("/hadith");
      for (const b of HADITH_BOOKS) paths.push(`/hadith/${b}`);
      break;
    case "duas":
      for (const c of getAllCategories()) paths.push(`/duas/${c.slug}`);
      for (const d of getAllDuas()) paths.push(`/duas/${d.category}/${d.slug}`);
      break;
    case "cities":
      for (const c of CITIES) paths.push(`/prayer-times/${c.slug}`);
      break;
    case "names":
      for (const n of getAllNames()) paths.push(`/names-of-allah/${n.slug}`);
      break;
    case "salah":
      for (const t of getAllSalahTutorials()) paths.push(`/learn-salah/${t.slug}`);
      break;
    case "figures":
      for (const f of getAllFigures()) paths.push(`/learn/${f.slug}`);
      break;
    case "blog":
      paths.push("/blog");
      for (const p of getAllPosts()) paths.push(`/blog/${p.slug}`);
      break;
  }
  return paths;
}

function urlBlock(loc: string, lastmod: string, alts: { locale: string; href: string }[]): string {
  const parts = [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
  ];
  for (const a of alts) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${escapeXml(a.href)}"/>`,
    );
  }
  parts.push("  </url>");
  return parts.join("\n");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ shard: string }> },
): Promise<Response> {
  const { shard: shardParam } = await ctx.params;
  const shardName = shardParam.replace(/\.xml$/i, "") as Shard;
  if (!SHARDS.includes(shardName)) {
    return new Response("Not found", { status: 404 });
  }

  const paths = buildPaths(shardName);
  const urlBlocks: string[] = [];

  for (const p of paths) {
    // Default-locale canonical entry with full hreflang alternates (only for
    // locales that actually ship translated content — untranslated locales are
    // noindex and don't appear here).
    const alts = INDEXABLE_LOCALES.map((l) => ({
      locale: l,
      href: siteUrl(l === routing.defaultLocale ? p : `/${l}${p === "/" ? "" : p}`),
    }));
    urlBlocks.push(urlBlock(siteUrl(p), lastmodForPath(p), alts));
    // Non-default indexable locale variants (no alt list — Google reads it
    // from the canonical above)
    for (const l of INDEXABLE_LOCALES) {
      if (l === routing.defaultLocale) continue;
      urlBlocks.push(urlBlock(siteUrl(`/${l}${p === "/" ? "" : p}`), lastmodForPath(p), []));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlBlocks.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
