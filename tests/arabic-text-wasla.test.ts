// Regression test for the Imlaei-vs-Uthmani orthography rule.
//
// The site serves South-Asian + Turkish + North-African readers whose local
// mushafs use plain alef (ا). The Saudi Madinah-Mushaf alef-wasla (ٱ, U+0671)
// reads as "wrong" to them. `cleanArabicForDisplay` is the last defence —
// even if a data pipeline or component falls back to the `uthmani` field,
// visible text and SEO JSON-LD must come out with plain alef.
//
// See lib/arabic-text.ts for the full file-level rationale, and the
// quran-frontend-dev skill's "The site is in Imlaei, NOT Uthmani" pitfall.

import { describe, expect, it } from "vitest";
import { cleanArabicForDisplay } from "../lib/arabic-text";

describe("cleanArabicForDisplay — Imlaei orthography enforcement", () => {
  it("replaces U+0671 ARABIC LETTER ALEF WASLA (ٱ) with plain alef (ا)", () => {
    // Al-Fatihah 1:1 in Uthmani (text_uthmani from quran.com API)
    const uthmani = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
    const cleaned = cleanArabicForDisplay(uthmani);
    expect(cleaned).not.toContain("\u0671"); // ٱ must be gone
    expect(cleaned).toContain("ا"); // plain alef must remain
    expect(cleaned).toBe("بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ");
  });

  it("replaces EVERY occurrence of ٱ (not just the first)", () => {
    // Al-Ma'idah 5:6 excerpt — 5 instances of ٱ in one passage
    const uthmani = "يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوٓا۟ إِذَا قُمْتُمْ إِلَى ٱلصَّلَوٰةِ فَٱغْسِلُوا۟";
    const cleaned = cleanArabicForDisplay(uthmani);
    expect([...cleaned].filter((c) => c === "\u0671").length).toBe(0);
    expect(cleaned.indexOf("\u0671")).toBe(-1);
  });

  it("still strips U+06DF (silent-letter dot) alongside ٱ handling", () => {
    const uthmani = "أُو۟لَـٰٓئِكَ ٱلَّذِينَ";
    const cleaned = cleanArabicForDisplay(uthmani);
    expect(cleaned).not.toContain("\u06DF"); // silent-letter dot gone
    expect(cleaned).not.toContain("\u0671"); // ٱ also gone
  });

  it("leaves already-Imlaei text untouched", () => {
    // Clean Imlaei Al-Fatihah 1:1 — plain alef, no wasla
    const imlaei = "بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ";
    const cleaned = cleanArabicForDisplay(imlaei);
    expect(cleaned).toBe(imlaei);
  });

  it("preserves diacritical marks that carry pronunciation info", () => {
    // Dagger alif (U+0670), shadda, fatha, kasra, damma, sukun must survive.
    const withDiacritics = "ٱللَّـٰهُ";
    const cleaned = cleanArabicForDisplay(withDiacritics);
    expect(cleaned).toContain("\u0670"); // dagger alif kept
    expect(cleaned).toContain("\u0651"); // shadda kept
    expect(cleaned).not.toContain("\u0671"); // ٱ swapped for ا
  });

  it("handles empty / undefined input safely", () => {
    expect(cleanArabicForDisplay("")).toBe("");
    // The function signature accepts string, so TypeScript-level undefined
    // isn't exercised here — the ?? "" guards at call sites handle that.
  });
});
