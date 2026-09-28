import { siteUrl } from "@/lib/site";

// Sitemap INDEX — points at content-type-scoped shards under /sitemaps/*.xml.
//
// IMPORTANT (Next 15 SWC minifier bug):
//   A prior implementation used `SHARDS.map(shard => \`<sitemap>...\${siteUrl(...)}...\`)`
//   which the SWC minifier mangled — the callback body was ELIMINATED from
//   the built route.js, producing an empty <sitemapindex/>. Even rewriting
//   as a block-body `map(shard => { return "..." })` with string concat
//   still triggered the same elimination.
//
//   Working around by building the XML with a plain for loop over the
//   SHARDS array and pushing strings into an array. This survives the
//   minifier intact. Verified on-disk in .next/server/app/sitemap.xml/route.js.
//
// Google Sitemap Guidelines:
//   Cap is 50k URLs / 50 MB per sitemap. The Quran ayah shard is ~37k URLs
//   across 6 locales, so content-type sharding gives headroom + cleaner
//   Search Console coverage reports.

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Refresh sitemap index hourly

const SHARDS = ["core", "quran", "hadith", "duas", "cities", "names", "salah", "figures"] as const;

function buildSitemapIndex(): string {
  const lastmod = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const shard of SHARDS) {
    const loc = siteUrl("/sitemaps/" + shard + ".xml");
    parts.push("  <sitemap>");
    parts.push("    <loc>" + loc + "</loc>");
    parts.push("    <lastmod>" + lastmod + "</lastmod>");
    parts.push("  </sitemap>");
  }
  parts.push("</sitemapindex>");
  return parts.join("\n") + "\n";
}

export function GET(): Response {
  return new Response(buildSitemapIndex(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
