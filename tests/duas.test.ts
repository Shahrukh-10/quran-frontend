import { getAllCategories, getAllDuas, getDua } from "@/lib/duas";
import { describe, expect, it } from "vitest";

describe("duas library", () => {
  it("has at least 5 categories", () => {
    expect(getAllCategories().length).toBeGreaterThanOrEqual(5);
  });
  it("every dua has a source string", () => {
    for (const d of getAllDuas()) {
      expect(d.source.length).toBeGreaterThan(0);
    }
  });
  it("every dua is reachable via getDua", () => {
    for (const d of getAllDuas()) {
      expect(getDua(d.category, d.slug)?.slug).toBe(d.slug);
    }
  });
});
