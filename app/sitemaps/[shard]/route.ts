import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
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
];

const HADITH_BOOKS = ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"];

const SHARDS = ["core", "quran", "hadith", "duas", "cities", "names", "salah", "figures"] as const;
type Shard = (typeof SHARDS)[number];

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
  }
  return paths;
}

function urlBlock(loc: string, lastmod: string, alts: { locale: string; href: string }[]): string {
  const parts = [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`, `    <lastmod>${lastmod}</lastmod>`];
  for (const a of alts) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${escapeXml(a.href)}"/>`,
    );
  }
  parts.push(`  </url>`);
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

  const lastmod = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
  const paths = buildPaths(shardName);
  const urlBlocks: string[] = [];

  for (const p of paths) {
    // Default-locale canonical entry with full hreflang alternates
    const alts = locales.map((l) => ({
      locale: l,
      href: siteUrl(l === routing.defaultLocale ? p : `/${l}${p === "/" ? "" : p}`),
    }));
    urlBlocks.push(urlBlock(siteUrl(p), lastmod, alts));
    // Non-default locale variants (no alt list — Google reads it from the
    // canonical above)
    for (const l of locales) {
      if (l === routing.defaultLocale) continue;
      urlBlocks.push(urlBlock(siteUrl(`/${l}${p === "/" ? "" : p}`), lastmod, []));
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urlBlocks.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
