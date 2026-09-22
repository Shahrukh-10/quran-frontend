import { siteUrl } from "@/lib/site";

// Sitemap INDEX — points at content-type-scoped shards under /sitemaps/*.xml.
//
// Google Sitemap Guidelines (https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview):
// - A single sitemap file is capped at 50,000 URLs / 50 MB. The Quran ayah
//   section alone is ~37k URLs across 6 locales, so we shard by content type
//   for headroom and cleaner Search Console coverage reports.
// - This root /sitemap.xml is a <sitemapindex>, not a <urlset>. Each entry
//   links to a shard with its own <urlset>.
// - Only <loc> + <lastmod> are populated — Google ignores <changefreq> and
//   <priority>, so we drop them to keep the file terse.
// - The `robots.txt` `Sitemap:` directive points at this index URL.

export const dynamic = "force-static";
export const revalidate = false;

const SHARDS = ["core", "quran", "hadith", "duas", "cities", "names", "salah", "figures"];

export function GET(): Response {
  const lastmod = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);
  const entries = SHARDS.map(
    (shard) =>
      `  <sitemap>\n    <loc>${siteUrl(`/sitemaps/${shard}.xml`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`,
  ).join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries +
    `\n</sitemapindex>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
