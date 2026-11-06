# Markdown alternates for hub pages (deferred — reference design)

**Status:** Documented, not implemented. The SEO audit (2026-11-05) suggested
offering `.md` siblings or `Accept: text/markdown` content negotiation for key
hub pages to improve AI-agent ingestion. This is a *Low* priority item and a
full implementation is a broad change (a markdown renderer per hub, kept in
sync with the React/JSON-LD source of truth), so it is deferred. This file
records the recommended low-risk approach so it can be picked up later without
re-deriving it.

## Why it was deferred

- `app/index.md/route.ts` and `app/llms-full.txt/route.ts` currently re-export
  the clean-404 handler from `lib/http-404.ts` — they are intentional 404 stubs
  for crawler probes, **not** a working markdown-serving pattern.
- Hub content (Quran, hadith, duas, names, prayer-times) is dynamic and already
  server-rendered as HTML with rich JSON-LD. A parallel markdown representation
  must be generated from the same data layer (`lib/quran`, `lib/duas`, etc.) to
  avoid drift. That generator does not exist yet.
- The already-published `llms.txt` (and a future `llms-full.txt`) already give
  AI agents a clean, link-rich index, so the marginal value of per-page `.md`
  is low relative to the maintenance cost.

## Recommended approach (lowest risk): per-hub `.md` route handlers

Add a Route Handler at `app/<hub>.md/route.ts` that reads the same data the
page reads and emits `text/markdown`. The middleware matcher already excludes
paths containing a dot (`.*\\..*`), so `/quran.md` bypasses the locale rewrite
and hits the route handler directly — no routing changes required.

```ts
// app/quran.md/route.ts
import { getAllSurahs } from "@/lib/quran";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function GET(): Response {
  const surahs = getAllSurahs();
  const lines = [
    "# The Quran — Quran Daily",
    "",
    "> All 114 surahs with translations, transliteration, tafsir, and audio.",
    "> Canonical HTML: " + siteUrl("/quran"),
    "",
    "## Surahs",
    "",
    ...surahs.map(
      (s) =>
        `- [${s.number}. ${s.name} (${s.englishTranslation})](${siteUrl(`/quran/${s.slug}`)}) — ${s.ayahCount} ayat, ${s.revelation}`,
    ),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
```

Repeat for `app/duas.md/route.ts`, `app/hadith.md/route.ts`,
`app/names-of-allah.md/route.ts`, and `app/prayer-times.md/route.ts`, each
pulling from its own data module. Keep them `force-static` so they prerender
and are served from the edge cache like the rest of the site.

Link the `.md` alternate from the HTML hub page so agents can discover it:

```tsx
// in the hub page's generateMetadata()
alternates: {
  canonical: siteUrl("/quran"),
  types: { "text/markdown": siteUrl("/quran.md") },
},
```

## Alternative: `Accept: text/markdown` content negotiation

A single `middleware.ts` branch could inspect the `Accept` header and rewrite
to the `.md` handler when `text/markdown` is preferred. This keeps one URL per
hub but adds request-time logic to the hot path and a `Vary: Accept` cache
dimension. The per-hub `.md` route handlers above are preferred because they
are cacheable, discoverable, and have zero effect on the existing HTML routes.

## Checklist when implementing

- [ ] One `.md` route handler per hub, reading the live data module.
- [ ] `Content-Type: text/markdown; charset=utf-8` + `dynamic = "force-static"`.
- [ ] `alternates.types["text/markdown"]` on each hub page's metadata.
- [ ] Add the `.md` URLs to `llms.txt` / `llms-full.txt`.
- [ ] A test asserting each `.md` route returns 200 + `text/markdown`.
