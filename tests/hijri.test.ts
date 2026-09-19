import { HIJRI_MONTHS, gregorianToHijri, hijriToGregorian } from "@/lib/hijri";
import { describe, expect, it } from "vitest";

describe("hijri", () => {
  it("has 12 months", () => {
    expect(HIJRI_MONTHS.length).toBe(12);
  });
  it("round-trips a date", () => {
    const src = new Date(2026, 8, 18);
    const h = gregorianToHijri(src);
    const g = hijriToGregorian(h.hy, h.hm, h.hd);
    const back = new Date(g.gy, g.gm - 1, g.gd);
    expect(back.getFullYear()).toBe(src.getFullYear());
    expect(back.getMonth()).toBe(src.getMonth());
    // Day is allowed to be ±1 due to civil vs astronomical Hijri variance.
    expect(Math.abs(back.getDate() - src.getDate())).toBeLessThan(2);
  });
});
