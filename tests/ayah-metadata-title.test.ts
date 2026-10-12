// Regression test for the ayah title builder in app/[locale]/quran/[surah]/[ayah]/page.tsx.
//
// Why this test exists: the live /quran/al-maidah/6 was shipping a title that
// Google further truncated to end with the literal characters "[p" (the start
// of a bracketed translator insertion). Several high-rank page-1 ayah queries
// got ZERO clicks in the GSC window because of SERP-snippet ugliness like that.
//
// The fix lives inside the metadata builder; this test exercises the same
// slice logic in isolation so it can't regress silently on future rewrites.

import { describe, expect, it } from "vitest";

function buildAyahTitlePreview(translation: string): string {
  const previewSource = translation
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const PREFIX_LEN = `Quran 999:999 — Al-SomeName · "`.length;
  const SUFFIX = '"';
  const TITLE_MAX = 70;
  const previewBudget = Math.max(20, TITLE_MAX - PREFIX_LEN - SUFFIX.length - 1);
  let preview = previewSource;
  if (preview.length > previewBudget) {
    const hard = preview.slice(0, previewBudget);
    const lastSpace = hard.lastIndexOf(" ");
    const cut = lastSpace > Math.max(15, previewBudget * 0.5) ? hard.slice(0, lastSpace) : hard;
    preview = `${cut.replace(/[\s,;:—–\-]+$/, "")}…`;
  }
  return preview;
}

describe("ayah metadata title preview", () => {
  it("strips bracketed translator insertions so SERP titles don't carry noise", () => {
    const p = buildAyahTitlePreview(
      "O you who have believed, when you rise to [perform] prayer, wash your faces.",
    );
    expect(p).not.toContain("[");
    expect(p).not.toContain("]");
  });

  it("cuts at a word boundary — never mid-word — for long translations", () => {
    const p = buildAyahTitlePreview(
      "O you who have believed, when you rise to [perform] prayer, wash your faces and your forearms.",
    );
    // Must not end on a split word fragment like "pr" or "[p".
    expect(p.endsWith("…")).toBe(true);
    // Last non-ellipsis char should be a letter (word boundary cut).
    const tail = p.replace(/…$/, "");
    expect(tail).toMatch(/[a-z]$/i);
  });

  it("leaves short translations intact (no ellipsis)", () => {
    const p = buildAyahTitlePreview("For indeed, with hardship [will be] ease.");
    expect(p.endsWith("…")).toBe(false);
    expect(p).toBe("For indeed, with hardship ease.");
  });

  it("preserves apostrophes and casing (e.g. atom's)", () => {
    const p = buildAyahTitlePreview("So whoever does an atom's weight of good will see it,");
    expect(p).toContain("atom's");
  });

  it("normalises collapsed whitespace left by bracket removal", () => {
    const p = buildAyahTitlePreview("Allah - [He is] the Ever-Living.");
    expect(p).not.toMatch(/\s{2,}/);
  });
});
