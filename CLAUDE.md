# CLAUDE.md — Project rules for AI-assisted development

**Project:** Islamic website — Quran, duas, prayer times, Qibla, Salah tutorials, more.
**Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind, shadcn/ui, next-intl.
**Hosting:** Cloudflare Pages.
**Full plan:** `docs/PLAN.md`. **Architecture decisions:** `docs/ARCHITECTURE.md`. **Design system:** `docs/DESIGN.md` (Apple HIG-inspired).

## Non-negotiable rules

1. **Server components by default.** Add `"use client"` only when you need state, effects, or browser APIs. If you add it, justify in a one-line comment.
2. **Every content page is statically generated.** `generateStaticParams` for all Quran ayat, duas, city prayer-time pages, 99 Names, Salah tutorials. Dynamic rendering is a bug unless the data is user-specific.
3. **TypeScript strict. No `any`, no `as unknown as`, no `@ts-ignore`.** If a type is hard, model it — don't escape it.
4. **Islamic content is not vibe-code-able.** Every dua, hadith, translation, tafsir excerpt must come from a sourced file in `content/` with a `source:` and (where applicable) `grading:` frontmatter field. AI generates *code*, never *religious content*.
5. **No tracking, no ads, no login-required flows.** Bookmarks, progress, streaks all go to `localStorage` unless the user explicitly opts into an account (V3 only). No Google Analytics — use Cloudflare Web Analytics.
6. **Accessibility is a launch requirement, not a V2 feature.** Semantic HTML, ARIA labels, keyboard nav, screen-reader tested. High-contrast + dyslexia-friendly modes ship in V1.
7. **PWA offline from day 1.** Quran text, duas, tutorials must work with no network after first visit.
8. **UI follows `docs/DESIGN.md`.** Apple HIG-inspired: restraint, whitespace, Inter/Amiri Quran fonts, 8pt grid, subtle spring motion, 44px min tap targets, no pop-ups, no ads, no gradients. If the `apple-design` skill is installed at `~/.claude/skills/apple-design`, invoke it after every UI change.

## Layout

```
app/                 Next.js App Router routes (see docs/ARCHITECTURE.md §URLs)
components/          Shared UI. shadcn primitives in components/ui/.
content/             MDX + JSON: duas, tutorials, 99 names, seerah.
data/                Prefetched static data (Quran text, translations) — build-time only.
lib/                 Pure functions: qibla bearing, prayer times, hijri, i18n helpers.
public/              Fonts (Amiri Quran), audio manifests, icons, opengraph images.
messages/            next-intl translation files (en.json, id.json, …).
scripts/             Build-time data fetch (Quran, translations, city lists).
tests/               Playwright E2E + Vitest unit tests for lib/.
docs/                PLAN.md, ARCHITECTURE.md, DECISIONS.md.
```

## Rules for AI-generated code

- Read `docs/ARCHITECTURE.md` before touching URLs, data flow, or i18n.
- One feature per prompt. Never "build the Quran module" — build the surah list, then the ayah page, then the audio player.
- Every generated component must be viewed in browser (desktop + mobile + RTL for Arabic) before commit.
- Any lib/ function with branching logic gets one Vitest test. Non-negotiable.
- Structured data (JSON-LD) on every content page. See `docs/ARCHITECTURE.md §SEO`.
- Never invent Islamic content. If sourced content is missing, stop and ask.

## Commands

```bash
pnpm dev            # local dev
pnpm build          # production build (must pass before any PR)
pnpm test           # vitest
pnpm test:e2e       # playwright
pnpm lint           # biome
pnpm lighthouse     # local lighthouse against localhost — target 95+ mobile
```

## When in doubt

Follow the plan (`docs/PLAN.md`). If the plan is silent, pick the option that:
1. renders on the server, 2. ships less JS, 3. needs no user account, 4. cites its source.
