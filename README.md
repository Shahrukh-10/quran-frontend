# Islamic Website

Free, global Islamic resource — Quran, duas, prayer times, Qibla, Salah tutorials, and more. Built on Next.js 15, deployed to Cloudflare Pages.

## For contributors (human or AI)

Read these three, in order:

1. **[CLAUDE.md](./CLAUDE.md)** — the rules. Non-negotiables for any code touching this repo.
2. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — how things fit together. URL structure, data flow, i18n, SEO, PWA.
3. **[docs/DESIGN.md](./docs/DESIGN.md)** — Apple HIG-inspired design system. Typography, color, motion, components.
4. **[docs/PLAN.md](./docs/PLAN.md)** — the full roadmap. 12-week V1 plan, V2/V3 features, prioritization.

Non-obvious decisions are in **[docs/DECISIONS.md](./docs/DECISIONS.md)**.

## Quickstart

Prerequisites: Node 20.11+, pnpm 10 (install with `npm install -g pnpm` or `corepack enable`).

```bash
cp .env.example .env.local   # first time only
pnpm install
pnpm dev                     # http://localhost:3000
```

Other scripts:

```bash
pnpm build           # production build
pnpm typecheck       # tsc --noEmit
pnpm lint            # biome check
pnpm lint:fix        # biome check + write
pnpm test            # vitest (lib/)
pnpm test:e2e        # playwright
```

## Current status

Scaffold is in place. What exists today:

- Next.js 15 App Router + TypeScript strict + Tailwind + Biome
- next-intl (en + id), locale-prefixed routing (default en has no prefix)
- Design tokens per `docs/DESIGN.md` (Apple-inspired), fonts self-hosted via `next/font`
- Header + footer, homepage, `/about`, `/sources`, 404
- Structured data component library (Organization, WebSite, Breadcrumb, Article, HowTo, FAQPage)
- `sitemap.xml`, `robots.txt`, `llms.txt`, `ai.txt`

What comes next (see `docs/PLAN.md §6 — Weeks 3–5`): the Quran module. Pull data from Al-Quran Cloud once at build time and generate all 6,236 ayah pages statically.
