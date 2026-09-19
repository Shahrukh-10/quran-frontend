# Build plan

The full 10-part plan lives here verbatim. `CLAUDE.md` and `ARCHITECTURE.md` extract the rules; this file is the source of intent.

**Current phase:** V1 module scaffolds landed on 2026-09-18. Content review + Quran corpus fetch + native-review polish remain before public launch.

**Feature list source of truth:** Part 3.2 (V1/V2/V3) and Part 3.3 (ummah-requested). Prioritization matrix in Part 3.4.

**How to use this file:**
- When picking what to build next, read Part 3.4 first.
- When making a technical choice, check `docs/ARCHITECTURE.md`; if silent, decide and log it in `docs/DECISIONS.md`.
- When adding a feature, cross-reference its number from Part 3 in the commit message.

## What has landed (2026-09-18)

- Quran module: all 114 surah pages statically generated, all 6,236 ayah pages generated, seed content for Al-Fatihah + Al-Ikhlas + Al-Falaq + An-Nas, `scripts/fetch-quran.ts` pulls the rest at build time.
- Ayah card component: Arabic + translation + transliteration + audio (5 reciters) + bookmark + share.
- Duas library: 6 categories, 18 seed duas (all sourced), category and slug pages.
- Salah tutorials: wudu, general 2-rakat, Fajr, Dhuhr/Asr/Isha, Maghrib, Witr, Jumu'ah, Janazah.
- 99 Names of Allah: all 99 with Arabic, transliteration, meaning, reflection, Quranic reference where established. Individual pages for each.
- Prayer times: on-device via `adhan` package, geolocation on the index page, static per-city page for 51 cities with lat/lon+timezone data.
- Qibla: initial-bearing math + Haversine distance + device-orientation compass with iOS permission gate.
- Hijri calendar: two-way converter + today's date + upcoming Islamic events for the current Hijri month.
- Tools: Tasbih counter (6 presets), Prayer tracker (5 daily + streaks), Zakat calculator (silver nisab default), Morning/Evening Adhkar.
- Adhan player: 3-muezzin selector, tap-to-play, never autoplay.
- Settings: theme (system/light/dark, no-flash inline script), dyslexia mode, low-bandwidth flag, export data as JSON, delete all data.
- Privacy manifesto page.
- PWA: manifest.webmanifest + icon + service worker (cache-first for static, stale-while-revalidate for audio, network-first for navigations with offline fallback).
- SEO: structured data on every content type (Article, Breadcrumb, HowTo, FAQPage), sitemap covering all SSG URLs with hreflang alternates.
- Accessibility: skip-to-content link, semantic HTML, 44px tap targets, visible focus rings, ARIA on toggle/switch/pressed states.
- Vitest tests for `lib/qibla`, `lib/prayer-times`, `lib/hijri`, `lib/quran`, `lib/duas`, `lib/names`.

## Immediate next steps

1. `pnpm install` locally, then `pnpm fetch:quran` to pull the full corpus.
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — should all pass. Any errors are release blockers.
3. Run `pnpm dev` and click through: Quran → surah → ayah, Duas → category → dua, prayer times (accept location prompt), Qibla, calendar, tools, adhan.
4. Native Indonesian reviewer to audit content in `messages/id.json`, `data/duas/duas.json` (id fields), `data/salah/tutorials.json`, `data/names.json`.
5. Scholarly reviewer to audit the duas, adhkar list, and salah tutorial content.
6. Buy the domain, wire up Cloudflare Pages, submit sitemap to Google Search Console.

## What has NOT landed yet

- Full Quran corpus (only 4 seed surahs in-repo; run the fetch script for the rest).
- Adhan audio URLs are placeholders — swap the URLs in `components/adhan/adhan-player.tsx` for licensed adhan tracks from Islamic Network or another CDN.
- Word-by-word Quran, tafsir excerpts, hadith library, seerah timeline.
- Live Iqamah times per masjid (V2 flagship — needs crowdsourcing infra).
- Reverts hub, Ramadan hub, Hajj/Umrah guide, sunnah-of-the-day, memorization tool.
- Full accessibility audit + Lighthouse gating in CI.
- Additional locales — ship `en` and `id` only, per `docs/DECISIONS.md`.
