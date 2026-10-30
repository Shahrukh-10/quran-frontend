import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Locales that ship untranslated and are `noindex` (see UNTRANSLATED_LOCALES in
// lib/seo.ts). next-intl emits an hreflang `Link:` response header listing ALL
// locales; advertising the noindex ones there contradicts the HTML <head> and
// the sitemap (both of which omit them) and has caused Google to index + rank
// those pages for English queries. Strip them from the Link header so all three
// hreflang sources agree. Keep this list in sync with lib/seo.ts.
const UNTRANSLATED_LOCALES = new Set(["ar", "ur", "tr", "fr"]);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const link = response.headers.get("link");
  if (link) {
    const filtered = link
      .split(",")
      .filter((part) => {
        const m = /hreflang="([^"]+)"/.exec(part);
        return !m || !UNTRANSLATED_LOCALES.has(m[1] ?? "");
      })
      .join(",");
    if (filtered) {
      response.headers.set("link", filtered);
    } else {
      response.headers.delete("link");
    }
  }
  return response;
}

export const config = {
  // Match all paths except static/data/api/_next assets, and except Next's
  // metadata routes (opengraph-image, twitter-image, sitemap.xml + sitemap
  // shards under /sitemaps/*, robots) which are already unique per-request
  // and must not be locale-rewritten.
  matcher: [
    "/((?!api|_next|_vercel|opengraph-image|twitter-image|sitemap.xml|sitemaps/|robots.txt|.*\\..*).*)",
  ],
};
