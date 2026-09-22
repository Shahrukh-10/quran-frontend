import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { CITIES } from "@/lib/cities";
import { getAllCategories, getAllDuas } from "@/lib/duas";
import { getAllFigures } from "@/lib/figures";
import { getAllNames } from "@/lib/names";
import { getAllSurahs } from "@/lib/quran";
import { getAllSalahTutorials } from "@/lib/salah";
import { siteUrl } from "@/lib/site";

// Manual sitemap route — replaces Next.js's `app/sitemap.ts` MetadataRoute.Sitemap.
//
// Why manual?
//   - Next's MetadataRoute.Sitemap does NOT let us emit an <?xml-stylesheet?>
//     processing instruction, so the sitemap was rendered by Chrome/Brave
//     as a wall of raw text values (unreadable for humans). Bots don't need
//     the stylesheet — they parse the XML directly and ignore it — but a
//     human opening /sitemap.xml should see a proper table.
//   - Also lets us fully control formatting: escape entities, control
//     whitespace, and keep <url> entries under Google's per-file limits
//     (50,000 URLs / 50 MB) with headroom.
//
// Google Sitemap Guidelines (https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview):
//   - Only <lastmod> is honoured; <changefreq> and <priority> are cosmetic.
//   - We keep <priority> for compatibility with older engines (Bing, Baidu,
//     Yandex) but drop <changefreq> entirely (dead byte per Google's docs).
//   - xhtml:hreflang alternates are included on every URL (Google requires
//     them to link locale variants together).

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

type Entry = {
  path: string;
  priority: number;
};

function escapeXml(unsafe: string): string {
  // Only escape characters that break XML — URL entities on this site are
  // pure ASCII slugs so this is mostly a defensive measure.
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
}

function altsFor(path: string): { locale: string; href: string }[] {
  return locales.map((l) => ({
    locale: l,
    href: siteUrl(l === routing.defaultLocale ? path : `/${l}${path === "/" ? "" : path}`),
  }));
}

function urlBlock(loc: string, lastmod: string, priority: number, alts: { locale: string; href: string }[]): string {
  const altXml = alts
    .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.locale}" href="${escapeXml(a.href)}"/>`)
    .join("\n");
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    altXml,
    "  </url>",
  ].join("\n");
}

function buildEntries(): Entry[] {
  const out: Entry[] = [];
  for (const p of TOP_LEVEL) out.push({ path: p, priority: p === "/" ? 1.0 : 0.7 });
  for (const s of getAllSurahs()) {
    out.push({ path: `/quran/${s.slug}`, priority: 0.8 });
    for (let n = 1; n <= s.ayahCount; n++) {
      out.push({ path: `/quran/${s.slug}/${n}`, priority: 0.6 });
    }
  }
  for (const c of getAllCategories()) out.push({ path: `/duas/${c.slug}`, priority: 0.7 });
  for (const d of getAllDuas()) out.push({ path: `/duas/${d.category}/${d.slug}`, priority: 0.6 });
  for (const n of getAllNames()) out.push({ path: `/names-of-allah/${n.slug}`, priority: 0.6 });
  for (const tut of getAllSalahTutorials()) out.push({ path: `/learn-salah/${tut.slug}`, priority: 0.7 });
  for (const f of getAllFigures()) out.push({ path: `/learn/${f.slug}`, priority: 0.7 });
  for (const city of CITIES) out.push({ path: `/prayer-times/${city.slug}`, priority: 0.65 });
  return out;
}

export function GET(): Response {
  // Stable per-build lastmod (NEXT_PUBLIC_BUILD_DATE) so the freshness signal
  // reflects the actual deploy, not the request time.
  const lastmod = process.env.NEXT_PUBLIC_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

  const entries = buildEntries();
  const urlBlocks: string[] = [];

  for (const e of entries) {
    const defaultLocaleUrl = siteUrl(e.path);
    const alts = altsFor(e.path);
    // Emit the default-locale canonical entry with full hreflang alternates
    urlBlocks.push(urlBlock(defaultLocaleUrl, lastmod, e.priority, alts));
    // Emit each non-default locale variant (no alternates — Google reads the
    // canonical entry above for the alternate set)
    for (const l of locales) {
      if (l === routing.defaultLocale) continue;
      const localePath = `/${l}${e.path === "/" ? "" : e.path}`;
      urlBlocks.push(urlBlock(siteUrl(localePath), lastmod, Math.max(0.4, e.priority - 0.1), []));
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urlBlocks.join("\n") +
    `\n</urlset>\n`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache at the edge for an hour; the file is rebuilt on every deploy.
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
