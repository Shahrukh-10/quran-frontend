import { GET as getIndex } from "@/app/sitemap.xml/route";
import { generateStaticParams, GET as getShard } from "@/app/sitemaps/[shard]/route";
import { getAllSurahs } from "@/lib/quran";
import { siteUrl } from "@/lib/site";
import { describe, expect, it } from "vitest";

const request = new Request(siteUrl("/sitemap.xml"));
const cacheControl = "public, max-age=3600, s-maxage=3600";

describe("sitemap handlers", () => {
  it("keeps all nine shard URLs without claiming build time as lastmod", async () => {
    const response = getIndex();
    const xml = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe(cacheControl);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).not.toContain("lastmod");
    const params = generateStaticParams();
    expect(params).toHaveLength(9);
    for (const { shard } of params)
      expect(xml).toContain(`<loc>${siteUrl(`/sitemaps/${shard}`)}</loc>`);
    expect(xml.match(/<sitemap>/g)).toHaveLength(9);
  });

  it.each(generateStaticParams().map(({ shard }) => shard))(
    "%s omits unverifiable timestamps and preserves reciprocal en/id alternates",
    async (shard) => {
      const response = await getShard(request, { params: Promise.resolve({ shard }) });
      const xml = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(cacheControl);
      expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
      expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
      expect(xml).not.toContain("lastmod");
      expect(xml).not.toMatch(/hreflang="(?:ar|ur|tr|fr)"/);
      const blocks = [...xml.matchAll(/<url>\s*<loc>(.*?)<\/loc>(.*?)<\/url>/gs)];
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks.length).toBeLessThanOrEqual(50_000);
      const rows = new Map(blocks.map((match) => [match[1], match[2]]));
      for (const [loc, alternates] of rows) {
        const links = [...(alternates ?? "").matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)];
        expect(links.map((link) => link[1])).toEqual(["en", "id", "x-default"]);
        expect(links.some((link) => link[2] === loc)).toBe(true);
        for (const link of links) expect(rows.get(link[2])).toBe(alternates);
      }
      if (shard === "quran.xml") {
        expect(rows.size).toBe(getAllSurahs().length * 2);
        expect(rows.has(siteUrl("/quran/al-fatihah"))).toBe(true);
        expect(rows.has(siteUrl("/id/quran/al-fatihah"))).toBe(true);
        expect(rows.has(siteUrl("/quran/al-fatihah/1"))).toBe(false);
      }
      if (shard === "core.xml") {
        expect(rows.has(siteUrl("/"))).toBe(true);
        expect(rows.has(siteUrl("/id"))).toBe(true);
      }
    },
  );

  it("returns 404 for an unknown shard", async () => {
    const response = await getShard(request, { params: Promise.resolve({ shard: "unknown.xml" }) });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });
});
