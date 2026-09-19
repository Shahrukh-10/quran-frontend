import { computePrayerTimes, nextPrayer } from "@/lib/prayer-times";
import { describe, expect, it } from "vitest";

describe("prayer-times", () => {
  it("computes six times for a given day", () => {
    const times = computePrayerTimes({
      lat: 21.422487,
      lon: 39.826206,
      date: new Date("2026-01-01T00:00:00Z"),
      method: "Makkah",
      madhab: "shafi",
    });
    for (const t of Object.values(times)) {
      expect(t).toBeInstanceOf(Date);
      expect(Number.isNaN(t.getTime())).toBe(false);
    }
  });

  it("orders times ascending", () => {
    const times = computePrayerTimes({
      lat: 51.5074,
      lon: -0.1278,
      date: new Date("2026-06-15T00:00:00Z"),
      method: "MWL",
    });
    const order = [times.fajr, times.sunrise, times.dhuhr, times.asr, times.maghrib, times.isha];
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1];
      const curr = order[i];
      if (prev && curr) {
        expect(prev.getTime()).toBeLessThan(curr.getTime());
      }
    }
  });

  it("picks the next prayer after 'now'", () => {
    const times = computePrayerTimes({
      lat: 21.422487,
      lon: 39.826206,
      date: new Date("2026-01-01T00:00:00Z"),
      method: "Makkah",
    });
    // Move 'now' to just before Dhuhr — next should be dhuhr.
    const justBefore = new Date(times.dhuhr.getTime() - 60_000);
    expect(nextPrayer(justBefore, times)).toBe("dhuhr");
  });
});
