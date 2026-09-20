// Shared SEO helpers — centralise hreflang and og:image emission so every
// `generateMetadata` in the app stays consistent.
//
// Why this file exists:
//   1. `og:image` — Next.js merges the `openGraph` metadata block SHALLOWLY.
//      A page that overrides `openGraph: { url }` silently drops the layout's
//      `openGraph.images` array. Every content page was shipping blank OG cards.
//      `mergedOgImages(alt)` returns the canonical images array so pages just
//      spread it back in.
//   2. `alternates.languages` — same shallow-merge trap. Pages that override
//      `alternates.canonical` need to re-emit the language map too, including
//      an `x-default`. `hreflangLanguages(path)` returns that map.
//
// Keep this file free of React/Next imports so it can be used by both server
// components and metadata functions without pulling in the React runtime.
import { locales } from "@/i18n/config";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site";

/**
 * The canonical Open Graph images array for a page. Pass an `alt` that
 * describes the specific page (e.g. `"Surah Al-Fatihah"`). Callers spread
 * the result into `openGraph.images`.
 *
 * We deliberately keep this a single 1200×630 hit — Next.js generates the
 * runtime `/opengraph-image` off `app/opengraph-image.tsx`; every locale
 * inherits it.
 */
export function mergedOgImages(alt: string) {
  return [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt,
    },
  ];
}

/**
 * Build the `alternates.languages` map for hreflang emission. Pass a
 * locale-agnostic path (e.g. `/quran/al-fatihah`, without any `/en` prefix).
 * The map covers every locale we ship plus `x-default` (which points to the
 * default-locale variant — no prefix).
 *
 * Locale prefix strategy matches `next-intl` `as-needed`: the default locale
 * (`en`) has no prefix, every other locale is prefixed.
 */
export function hreflangLanguages(path: string): Record<string, string> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const localePath = (locale: string) =>
    locale === routing.defaultLocale ? normalizedPath : `/${locale}${normalizedPath}`;
  const map: Record<string, string> = {};
  for (const l of locales) {
    map[l] = siteUrl(localePath(l));
  }
  map["x-default"] = siteUrl(normalizedPath);
  return map;
}
