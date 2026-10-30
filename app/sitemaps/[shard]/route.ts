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
// standard <urlset> with <loc> only (Google ignores
// <changefreq> and <priority>).
//
// We DO emit xhtml:hreflang alternates per-URL because Google needs those
// to link the indexable locale variants together and pick the right one per user.

export const dynamic = "force-static";
export const revalidate = false;

const TOP_LEVEL = [
  "/",
  "/about",
  "/sources",
  "/privacy",
  "/quran",
  "/quran/browse",
  "/quran/download",
  "/quran/read",
  "/mushaf",
  "/duas",
  "/prayer-times",
  "/qibla",
  "/learn-salah",
  "/learn",
  "/names-of-allah",
  "/calendar",
  "/adhan",
  "/plans",
  "/memorize",
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
      // CRAWL-BUDGET STRATEGY (2026-10-05):
      // Previously emitted ~6,236 surah+ayah pages × 2 indexable locales ≈ 12,700 URLs.
      // For a new domain (DR ~0) GSC was indexing 0 of 13,234 sitemap URLs — classic
      // crawl-budget drowning. Shrunk to surah-index pages only (114 surahs × 2 locales
      // = 228 URLs). Individual ayah pages (/quran/<slug>/<n>) still exist and work for
      // users; they are discovered via internal links on surah index pages and will be
      // re-added to the sitemap in batches of 1,000 once core pages rank.
      // See skill: promptspace-20k-weekly-growth → blog-corpus-deadweight-audit.
      for (const s of getAllSurahs()) {
        paths.push(`/quran/${s.slug}`);
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

function urlBlock(loc: string, alts: { locale: string; href: string }[]): string {
  const parts = ["  <url>", `    <loc>${escapeXml(loc)}</loc>`];
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
    // Full reciprocal hreflang set — EVERY url row (default + each locale
    // variant) must list all alternates incl. a self tag and x-default, per
    // Google's sitemap spec. (Previously the /id rows shipped `[]`, which is
    // non-compliant — Google does not read alternates from an adjacent row.)
    const alts = [
      ...INDEXABLE_LOCALES.map((l) => ({
        locale: l,
        href: siteUrl(l === routing.defaultLocale ? p : `/${l}${p === "/" ? "" : p}`),
      })),
      { locale: "x-default", href: siteUrl(p) },
    ];
    urlBlocks.push(urlBlock(siteUrl(p), alts));
    for (const l of INDEXABLE_LOCALES) {
      if (l === routing.defaultLocale) continue;
      urlBlocks.push(urlBlock(siteUrl(`/${l}${p === "/" ? "" : p}`), alts));
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
