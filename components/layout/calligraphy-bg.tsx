"use client";

// CalligraphyBg — the drifting Arabic-typography site background.
//
// PURPOSE: This is a purely decorative visual layer (Names of Allah, dhikr words,
// Quranic terms) that drifts right→left at slow speeds. It is NOT content.
//
// WHY CLIENT-ONLY:
// Previously this was rendered server-side inside app/[locale]/layout.tsx, which
// meant every one of the site's ~40,000 SSR HTML documents (every ayah, hadith,
// dua, prayer-times page, etc.) started with 500+ characters of the SAME
// decorative Arabic words in the initial HTML flow.
//
// To Googlebot's content classifier, that made all 40k pages look near-duplicate
// at the top — same opening tokens, then only a tiny bit of unique content.
// Combined with the fact that AI answer engines (ChatGPT, Perplexity, Google AI
// Overviews) read the initial HTML preferentially, this decoration was drowning
// out our real content in the ingest window and depressing citations + rankings.
//
// FIX: render the exact same visual on the client after hydration. Users see it
// (visual continuity preserved). Googlebot, GPTBot, ClaudeBot, Bingbot and every
// other AI/search crawler that reads the initial HTML sees zero decoration —
// their first indexed characters are our real page content (the ayah, the
// hadith, the dua). SPA-crawling bots that do full JS execution (Googlebot
// modern) will still see the decoration after render, but by then the page's
// actual text has already been classified as the primary content signal.
//
// aria-hidden preserves the accessibility semantics.

import { useEffect, useState } from "react";

const ROWS: string[][] = [
  // Row 1 — Names of Allah (subset)
  ["الرَّحْمَٰن", "الرَّحِيم", "الْمَلِك", "الْقُدُّوس", "السَّلَام", "الْمُؤْمِن", "الْمُهَيْمِن", "الْعَزِيز"],
  // Row 2 — larger, core creed words
  ["اللَّه", "الْحَمْدُ لِلَّٰه"],
  // Row 3 — small worship vocabulary
  ["صَلَاة", "زَكَاة", "صَوْم", "حَجّ", "شَهَادَة", "تَقْوَىٰ", "إِيمَان", "إِحْسَان", "تَوْبَة"],
  // Row 4 — display size, majestic names
  ["الْجَبَّار", "الْمُتَكَبِّر", "الْخَالِق", "الْبَارِئ", "الْمُصَوِّر", "الْغَفَّار"],
  // Row 5 — Basmala + praises
  [
    "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيم",
    "سُبْحَانَ اللَّه",
    "الْحَمْدُ لِلَّٰه",
    "اللَّهُ أَكْبَر",
    "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّه",
  ],
  // Row 6 — small, gentle names
  ["الْوَدُود", "الرَّءُوف", "اللَّطِيف", "الْحَلِيم", "الْكَرِيم", "الْغَفُور", "الشَّكُور", "الْحَيّ", "الْقَيُّوم"],
  // Row 7 — Quranic terms, larger
  ["الْقُرْآن", "الْفُرْقَان", "الذِّكْر", "الْكِتَاب", "الْهُدَىٰ", "النُّور", "الْحَقّ"],
  // Row 8 — beloved names of Allah
  ["السَّمِيع", "الْبَصِير", "الْعَلِيم", "الْحَكِيم", "الْوَاسِع", "الْمَجِيد", "الْوَكِيل", "الْمَتِين"],
];

export function CalligraphyBg() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer until after the browser has painted the first meaningful frame.
    // rAF puts us after layout; the setTimeout guarantees we're not competing
    // with LCP work.
    const raf = requestAnimationFrame(() => {
      const t = setTimeout(() => setMounted(true), 0);
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!mounted) return null;

  return (
    <div className="site-bg" aria-hidden>
      {ROWS.map((words, rowIdx) => (
        <div
          key={rowIdx}
          className={`site-bg__row site-bg__row--${rowIdx + 1}`}
        >
          {[...words, ...words].map((w, i) => (
            <span key={i} lang="ar" dir="rtl">
              {w}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
