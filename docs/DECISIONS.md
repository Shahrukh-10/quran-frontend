# Decision log

One entry per non-obvious choice. Newest at the top. If you reverse a decision, add a new entry — don't edit the old one.

Format: `## YYYY-MM-DD — Title` → **Decision**, **Alternatives**, **Why**, **Revisit when**.

---

## 2026-09-18 — SSG every ayah into a single sitemap

**Decision:** Emit all 6,236 ayah URLs from `app/sitemap.ts` in one `MetadataRoute.Sitemap`. Same for the 99 Names, all duas, all salah tutorials, all city prayer-time pages.
**Alternatives:** Sharded sitemap via `app/sitemap/[shard]/route.ts`, or excluding ayah pages from the sitemap and relying on internal linking.
**Why:** Every ayah is a landing page — we want them indexed as fast as possible. Single sitemap is simpler and stays under Google's 50k URL / 50MB limit (we sit at ~13k URLs across two locales).
**Revisit when:** URL count crosses ~40k, or the sitemap file crosses 25MB. Then shard.

## 2026-09-18 — Silver-standard nisab default for Zakat calculator

**Decision:** The Zakat calculator defaults to the silver nisab (595g) rather than the gold nisab.
**Alternatives:** Gold nisab (85g), user-picks-on-first-use.
**Why:** The silver standard is lower in modern currency, so more Muslims cross into being liable — this is safer for the poor (their entitlement to Zakat is more likely to be met). Users can override the nisab value directly.
**Revisit when:** A scholarly reviewer requests we surface both standards side-by-side, or default to gold with a "safer for the poor" toggle.

## 2026-09-18 — In-repo JSON content, not MDX, for duas / names / salah tutorials

**Decision:** Duas, 99 Names, and Salah tutorials live as JSON under `data/`, not MDX under `content/`.
**Alternatives:** The MDX pipeline mentioned in the plan.
**Why:** These are highly structured (Arabic, transliteration, translation-per-locale, source, grading, steps). JSON gets us strong typing without an MDX runtime. When we add long-form articles (tafsir, seerah, khawatir), those are a better fit for MDX.
**Revisit when:** We add tafsir or seerah content that needs rich embedded components.

## 2026-09-18 — Quran translation ships from a build-time fetch, not the repo

**Decision:** `scripts/fetch-quran.ts` pulls Arabic + translations + transliteration from Al-Quran Cloud on demand. Only a small set of seed surahs (Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas) ship with full text in the repo.
**Alternatives:** Ship all 114 surahs in `data/quran/surahs/*.json`.
**Why:** The full corpus is ~15MB per translation. Repos stay slim; contributors can add translations by editing the fetch script and re-running. Builds are still hermetic because the fetch runs locally, not on Cloudflare Pages.
**Revisit when:** Contributors report friction — then commit the fetched JSON to the repo.

## 2026-09-18 — Cloudflare Pages over Vercel

**Decision:** Deploy to Cloudflare Pages.
**Alternatives:** Vercel Free.
**Why:** Unlimited bandwidth on free tier. Vercel free tier bandwidth cap will hit us the moment SEO compounds. Cloudflare CDN is already global.
**Revisit when:** We need edge middleware Cloudflare Workers can't do, or Vercel's DX savings outweigh bandwidth cost.

## 2026-09-18 — Prayer times computed client-side

**Decision:** Use the `adhan` npm library, compute in the browser.
**Alternatives:** Aladhan API at runtime.
**Why:** No API dependency, no rate limit, no privacy leak (user location never leaves the device). Static city pages precompute a table for SEO.
**Revisit when:** `adhan` accuracy proves insufficient for any calculation method.

## 2026-09-18 — localStorage over accounts for V1

**Decision:** All user state (bookmarks, streaks, progress) in localStorage.
**Alternatives:** Supabase free tier from day 1.
**Why:** Zero backend cost, zero auth surface, zero PII, faster shipping. The plan calls accounts a V3 feature.
**Revisit when:** Users ask for cross-device sync in numbers, or V3 arrives.

## 2026-09-18 — English + Indonesian only at launch

**Decision:** Ship `en` and `id` locales only.
**Alternatives:** All 8 priority languages at launch.
**Why:** Native reviewers are the bottleneck, not code. Indonesian has 240M+ Muslims and less competition than English. Adding locales without native review = shipping broken religious content.
**Revisit when:** A native reviewer is confirmed for the next language.
