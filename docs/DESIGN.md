# Design system — Apple-inspired

Governs everything visual. Read alongside `CLAUDE.md`. When the `apple-design` skill is installed (`~/.claude/skills/apple-design`), it audits UI changes against Apple's Human Interface Guidelines — this doc is what we implement toward.

## Feel

Restraint over decoration. Content is the interface. Whitespace is a feature. Motion is subtle and purposeful. Every pixel earns its place.

If the design decision makes the page feel *busier*, it's wrong. If it makes the content easier to focus on, it's right.

## Typography

- **Latin:** SF Pro is not free to redistribute. Use **Inter** as the system-font stand-in — same visual DNA, open licensed. Loaded via `next/font` (self-hosted, no CDN).
- **Arabic:** **Amiri Quran** for Quran text (free, uthmanic script). **Noto Naskh Arabic** for translations and UI Arabic.
- Fallback stack always includes `-apple-system, BlinkMacSystemFont` first so Apple devices render in real SF.

Type scale (rem, `clamp()` for responsive):
```
display  clamp(2.5rem, 5vw, 4rem)     700  tight-tracking
title-1  clamp(2rem, 4vw, 3rem)       700
title-2  clamp(1.5rem, 3vw, 2rem)     600
title-3  clamp(1.25rem, 2.5vw, 1.5rem) 600
body     1rem                          400  1.6 leading
caption  0.875rem                      400
footnote 0.75rem                       400
```

Tracking: `-0.02em` on display/title-1, `-0.01em` on title-2/3, `0` on body.

Arabic Quran text: minimum `1.75rem`, leading `2.5`, right-aligned, `dir="rtl"`. Never squeeze it.

## Color

Neutral, respectful, calm. Never gamified.

**Light mode:**
- background: `#FBFBFD` (Apple's off-white)
- surface: `#FFFFFF`
- text-primary: `#1D1D1F`
- text-secondary: `#6E6E73`
- separator: `#D2D2D7`
- accent: `#0B7A3E` (deep Islamic green — chosen not gaudy)
- accent-muted: `#E8F0EA`

**Dark mode:**
- background: `#000000` (true black, OLED-friendly)
- surface: `#1C1C1E`
- surface-elevated: `#2C2C2E`
- text-primary: `#F5F5F7`
- text-secondary: `#98989D`
- separator: `#38383A`
- accent: `#30D158` (Apple's system green, tuned)

Contrast: minimum WCAG AA. Text-on-accent verified in both themes.

## Spacing

8pt grid. Every margin, padding, gap is a multiple of 4 (Tailwind's default). No `p-[13px]` — if you're reaching for arbitrary values, you're fighting the grid.

Section vertical rhythm: `py-16 md:py-24 lg:py-32`.

## Radii

Tailwind: `rounded-lg` (0.5rem) for buttons, `rounded-2xl` (1rem) for cards, `rounded-3xl` (1.5rem) for hero surfaces. Never `rounded-full` on anything that isn't an avatar or an icon button.

## Elevation

Not shadows-first. Apple uses layering and translucency.
- Cards: `bg-surface` + 1px separator, no shadow.
- Floating (modals, sheets): subtle `shadow-lg` with `backdrop-blur-xl bg-surface/80`.
- Sticky headers: `backdrop-blur-xl bg-background/70` with a hairline bottom separator.

## Motion

- All transitions: **spring-like** cubic-bezier `cubic-bezier(0.32, 0.72, 0, 1)` — Apple's default.
- Duration: 200ms (micro), 350ms (component), 500ms (page transition). Never longer.
- Respect `prefers-reduced-motion: reduce` — cut to instant.
- No bounce, no parallax on scroll, no continuous animation. Motion serves the interaction, not itself.

## Components

- **Buttons:** primary is filled accent, secondary is `bg-surface` with separator border, tertiary is text-only. Height 44px minimum (tap target). Never less than 8px between adjacent tap targets.
- **Nav bar:** translucent, sticks on scroll, hairline separator, blurred backdrop.
- **Cards:** flat, separator-bordered. Hover: 1% brightness lift, no shadow bloom.
- **Inputs:** 44px min height, rounded-lg, focus ring in accent color at 40% opacity.
- **Sheets (mobile):** slide up from bottom, rounded top, drag-to-dismiss.

## Icons

`lucide-react` for UI. Consistent 1.5px stroke. Never mix icon libraries.

## Imagery

- No stock photos. No decorative illustrations with people.
- Islamic geometric patterns as background only, at low opacity, sparingly.
- Every image has `width` + `height` set (kills CLS). `next/image` mandatory.

## Layout patterns

- **Max content width:** `max-w-4xl` for reading (Quran, tutorials, articles). `max-w-6xl` for dashboards.
- **Centered, generous margins.** Content-focused, never edge-to-edge on desktop.
- **Mobile first:** design at 375px width, expand up. Never build desktop-first and shrink.

## Responsive

Breakpoints (Tailwind defaults):
- Mobile: base (375px reference)
- `sm` 640px — landscape phones
- `md` 768px — tablets
- `lg` 1024px — small laptops
- `xl` 1280px — desktops
- `2xl` 1536px — large displays

Test at every one before shipping. Use Playwright device presets.

## Accessibility (not a section — a rule)

- Minimum tap target 44×44px (Apple HIG hard rule).
- All interactive elements keyboard-reachable, visible focus ring.
- Real semantic HTML (`<nav>`, `<article>`, `<button>` — never a clickable `<div>`).
- ARIA labels on icon-only buttons.
- Color is never the only signal — always paired with icon or text.
- Screen-reader tested with VoiceOver (macOS) at minimum before every content-type ships.

## What NOT to do

- No gradients on backgrounds. (Accents on illustrations only, if at all.)
- No box shadows on flat cards.
- No glassmorphism everywhere — reserve for floating elements.
- No emoji as decoration in the UI chrome.
- No auto-playing anything.
- No modals for confirmations that could be inline undo.
- No pop-ups. Ever. (Newsletter dialog, cookie dialog, "install our app" dialog — all banned.)

## Reference

When the `apple-design` skill is installed, invoke it (or run `/apple-design`) after every UI change. It cites specific HIG pages for findings. Until then, this doc is the source of truth.
