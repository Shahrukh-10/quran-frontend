import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except static/data/api/_next assets, and except Next's
  // metadata routes (opengraph-image, twitter-image, sitemap.xml + sitemap
  // shards under /sitemaps/*, robots) which are already unique per-request
  // and must not be locale-rewritten.
  matcher: ["/((?!api|_next|_vercel|opengraph-image|twitter-image|sitemap.xml|sitemaps/|robots.txt|.*\\..*).*)"],
};
