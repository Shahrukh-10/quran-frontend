import { describe, expect, it } from "vitest";
import { cleanHadithArabic } from "../lib/hadith-text";

describe("cleanHadithArabic", () => {
  it("returns empty for null/undefined/empty", () => {
    expect(cleanHadithArabic(null)).toBe("");
    expect(cleanHadithArabic(undefined)).toBe("");
    expect(cleanHadithArabic("")).toBe("");
  });

  it("strips U+200F right-to-left mark (the visible black dot bug)", () => {
    // Reproduced from Fawaz Ahmed's Bukhari dataset; the ‏"‏ ... ‏"‏‏.‏
    // pattern was rendering as visible marks in some browser Arabic fonts.
    const raw =
      "قَالَ ‏\"‏ الإِيمَانُ أَنْ تُؤْمِنَ بِاللَّهِ ‏\"‏‏.‏";
    const cleaned = cleanHadithArabic(raw);
    expect(cleaned).not.toContain("\u200F"); // no RLM anywhere
    expect(cleaned).not.toContain("\u200E"); // no LRM anywhere
  });

  it("normalizes narrator-quote pattern to Arabic guillemets when balanced", () => {
    const raw = 'قَالَ "الإِيمَانُ".';
    const cleaned = cleanHadithArabic(raw);
    // Elegant guillemets replace ASCII double-quotes when quote count is even.
    expect(cleaned).toContain("«");
    expect(cleaned).toContain("»");
    expect(cleaned).not.toContain('"');
  });

  it("is idempotent — applying twice equals applying once", () => {
    const raw =
      "حَدَّثَنَا مُسَدَّدٌ، ‏\"‏ قَالَ ‏\"‏‏.‏ عَنْ أَبِي هُرَيْرَةَ";
    const once = cleanHadithArabic(raw);
    const twice = cleanHadithArabic(once);
    expect(twice).toBe(once);
  });

  it("strips isolate and embedding controls (U+2066-U+2069, U+202A-U+202E)", () => {
    const raw = "\u2066Arabic\u2069 text \u202Awith\u202C marks";
    const cleaned = cleanHadithArabic(raw);
    for (const cp of [
      "\u2066",
      "\u2067",
      "\u2068",
      "\u2069",
      "\u202A",
      "\u202B",
      "\u202C",
      "\u202D",
      "\u202E",
    ]) {
      expect(cleaned).not.toContain(cp);
    }
  });

  it("collapses runs of whitespace and trims", () => {
    expect(cleanHadithArabic("  قَالَ    كَذَا   ")).toBe("قَالَ كَذَا");
  });

  it("preserves Arabic diacritics and punctuation", () => {
    const raw = "قَالَ رَسُولُ اللَّهِ ﷺ، إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ";
    expect(cleanHadithArabic(raw)).toBe(raw);
  });
});
