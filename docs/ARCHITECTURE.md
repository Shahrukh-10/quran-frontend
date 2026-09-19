# Architecture

Decisions that shape the codebase. Update this file when you change a decision — don't leave stale rules in `CLAUDE.md`.

## Rendering strategy

| Route family | Strategy | Why |
|---|---|---|
| `/`, `/about`, `/sources` | SSG | Static marketing/trust pages |
| `/quran/[surah]/[ayah]` | SSG (`generateStaticParams`) | 6,236 ayat → 6,236 HTML files. Zero runtime cost, best SEO. |
| `/duas/[category]/[slug]` | SSG from MDX | Content is in-repo |
| `/prayer-times/[city]` | SSG for top 1000 cities | Long-tail SEO. Times computed client-side per-user. |
| `/prayer-times` (geolocated) | Client component | Needs browser geolocation |
| `/qibla` | Client component | Needs magnetometer |
| `/learn-salah/[topic]` | SSG from MDX | |
| `/hadith/[collection]/[num]` | SSG (build-time fetch from Sunnah.com) | |

Rule: if the content is the same for every user, it's SSG. If it depends on the user's location or device, it's a client component nested inside an SSG shell.

## URL structure

See `CLAUDE.md` and `docs/PLAN.md §3.1`. Do not change without updating both.

Localized routes via `next-intl`: `/[locale]/quran/[surah]/[ayah]`. Default locale (`en`) has no prefix. `hreflang` alternates on every page.

## Data layer

- **Quran text + translations:** `scripts/fetch-quran.ts` runs once, pulls from Al-Quran Cloud API, writes to `data/quran/*.json`. Committed to repo. Re-run only when adding a translation.
- **Duas:** MDX in `content/duas/[category]/[slug].mdx`. Frontmatter: `title`, `arabic`, `transliteration`, `translation`, `source`, `grading`.
- **99 Names:** JSON in `content/names.json`.
- **Prayer times:** computed client-side. Library: `adhan` (npm, MIT license). No API calls at runtime for prayer times.
- **Hijri date:** `hijri-converter` npm package, pure JS.
- **Qibla bearing:** Haversine, `lib/qibla.ts`. No API.
- **User state (bookmarks, streaks, progress):** `localStorage` via a typed wrapper in `lib/storage.ts`.

## SEO / structured data

Every content page emits JSON-LD via a `<StructuredData>` component:
- Ayah pages → `Article` + `BreadcrumbList`
- Duas → `Article` + `FAQPage`
- Salah tutorials → `HowTo`
- Prayer times pages → `Place` + `Event`
- 99 Names → `DefinedTerm`

Sitemap is generated dynamically at `app/sitemap.ts` — one entry per SSG'd URL. `robots.txt` at `app/robots.ts`. `llms.txt` and `ai.txt` in `public/`.

Metadata: use Next.js `generateMetadata` per route. Title format: `{page} | {site}`. Every page has a unique description.

## Internationalization

- `next-intl` with route-based locales.
- Locale files: `messages/{en,id,ar,ur,tr,fr,ms,bn}.json`.
- RTL languages (Arabic, Urdu) set `dir="rtl"` on `<html>` and use Tailwind logical properties (`ps-4` not `pl-4`).
- **Ship with `en` + `id` only.** Add others when we have native reviewers, not before.
- Never machine-translate religious content.

## Performance targets

Lighthouse mobile, all pages:
- LCP < 1.5s, INP < 200ms, CLS < 0.05
- Perf ≥ 95, A11y ≥ 95, Best Practices ≥ 95, SEO = 100

Enforcement: `pnpm lighthouse` in CI blocks merge if any target regresses.

## PWA / offline

- Service worker via `next-pwa` or manual `workbox`.
- Precache: Quran JSON, all duas, all tutorials, 99 names, fonts.
- Runtime cache: audio (stale-while-revalidate), prayer-time city pages.
- Offline fallback page at `app/offline/page.tsx`.

## Privacy stance

- No cookies for tracking. Session cookies only for opt-in features (V3).
- No third-party JS except Cloudflare Web Analytics (privacy-friendly, no PII).
- No fingerprinting libraries. No Google Fonts CDN (self-host `Amiri Quran` and `Inter` via `next/font`).
- Privacy manifesto page at `/privacy` — plain language, no legalese padding.

## AI features (V2 — not yet built)

When we add them, they follow these rules:
- Retrieval-only. LLM never generates hadith, ruling, or unsourced tafsir.
- Every AI response cites the source text it summarized.
- Per-IP rate limit (20 queries/day) to stay within free tiers (Gemini Flash, Cloudflare Workers AI, Groq).
- Aggressive caching keyed on `(question, retrieved_chunk_ids)`.
- All AI outputs logged for quality review.

## Testing

- **Vitest** for `lib/` — every pure function that branches has a test. `lib/qibla.test.ts`, `lib/prayer-times.test.ts`, `lib/hijri.test.ts` are required.
- **Playwright** for critical flows: Quran page loads, prayer times render with mocked geolocation, Qibla page shows a bearing, offline mode after first visit.
- No component tests for now (YAGNI — Playwright covers the real thing).

## Decisions log

Notable choices with expiration dates in `docs/DECISIONS.md`. When you change a decision here, add a dated entry there explaining why.
