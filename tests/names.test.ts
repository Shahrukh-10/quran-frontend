import { getAllNames } from "@/lib/names";
import { describe, expect, it } from "vitest";

describe("99 names", () => {
  it("has 99 entries", () => {
    expect(getAllNames().length).toBe(99);
  });
  it("orders 1..99 uniquely", () => {
    const orders = getAllNames().map((n) => n.order);
    expect(new Set(orders).size).toBe(99);
  });
  it("has arabic and slug on each", () => {
    for (const n of getAllNames()) {
      expect(n.arabic.length).toBeGreaterThan(0);
      expect(n.slug.length).toBeGreaterThan(0);
    }
  });
});
