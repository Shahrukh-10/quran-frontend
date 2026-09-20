import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow: keep user-scoped, form, search, and low-value paths out of
        // the crawl. `/*?page=` also blocks paginated hadith URL variants
        // that duplicate the canonical (see SEO audit §1.13).
        disallow: [
          "/search",
          "/compare",
          "/account",
          "/settings",
          "/notes",
          "/goals",
          "/plans",
          "/memorize",
          "/iqamah/submit",
          "/api/",
          "/*?page=",
        ],
      },
      // Explicitly welcome major AI answer engines. They honour robots.txt
      // as of 2025 (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). Bing
      // stays welcome regardless of Copilot's crawler behaviour.
      {
        userAgent: [
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "Bingbot",
        ],
        allow: "/",
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/").replace(/\/$/, ""),
  };
}
