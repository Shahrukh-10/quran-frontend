import { execFileSync } from "node:child_process";
import { computePrayerTimes, nextPrayer, prayerDateInTimezone } from "@/lib/prayer-times";
import { describe, expect, it } from "vitest";

describe("prayer-times", () => {
  it.each([
    ["Asia/Dubai", "2026-10-30T21:00:00Z", 2026, 10, 31],
    ["America/New_York", "2026-11-01T00:30:00Z", 2026, 10, 31],
    ["America/New_York", "2026-03-08T06:59:00Z", 2026, 3, 8],
    ["America/New_York", "2026-03-08T07:01:00Z", 2026, 3, 8],
    ["America/New_York", "2026-11-01T05:30:00Z", 2026, 11, 1],
    ["America/New_York", "2026-11-01T06:30:00Z", 2026, 11, 1],
  ])("uses the city calendar date in %s at %s", (timeZone, instant, year, month, day) => {
    const date = prayerDateInTimezone(new Date(instant), timeZone);
    expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([year, month, day]);
  });

  it.each([
    [25.2048, 55.2708, "Asia/Dubai", "2026-10-30T21:00:00Z"],
    [40.7128, -74.006, "America/New_York", "2026-11-01T00:30:00Z"],
    [40.7128, -74.006, "America/New_York", "2026-03-08T07:01:00Z"],
    [40.7128, -74.006, "America/New_York", "2026-11-01T06:30:00Z"],
  ])("keeps %s, %s times independent of host timezone at %s %s", (lat, lon, timeZone, instant) => {
    const options = { lat, lon, timeZone, method: "MWL", madhab: "hanafi" };
    const script = `
      const { computePrayerTimes } = require("./lib/prayer-times.ts");
      if (Intl.DateTimeFormat().resolvedOptions().timeZone !== process.env.TZ) {
        throw new Error("Host timezone was not applied");
      }
      console.log(JSON.stringify(computePrayerTimes({
        ...${JSON.stringify(options)}, date: new Date(${JSON.stringify(instant)})
      })));
    `;
    const schedules = ["UTC", "America/Los_Angeles", "Asia/Tokyo"].map((hostTimezone) =>
      execFileSync(process.execPath, ["--import", "tsx", "-e", script], {
        env: { ...process.env, TZ: hostTimezone },
        encoding: "utf8",
      }),
    );
    expect(schedules[1]).toEqual(schedules[0]);
    expect(schedules[2]).toEqual(schedules[0]);
  });

  it("calculates Dubai's next calendar day after its local midnight", () => {
    const options = { lat: 25.2048, lon: 55.2708, method: "MWL" as const };
    const times = computePrayerTimes({
      ...options,
      date: new Date("2026-10-30T21:00:00Z"),
      timeZone: "Asia/Dubai",
    });
    expect(times).toEqual(computePrayerTimes({ ...options, date: new Date(2026, 9, 31, 12) }));
    expect(times).not.toEqual(computePrayerTimes({ ...options, date: new Date(2026, 9, 30, 12) }));
  });

  it("preserves the selected method and Madhab with a city timezone", () => {
    const options = {
      lat: 25.2048,
      lon: 55.2708,
      date: new Date("2026-10-30T21:00:00Z"),
      timeZone: "Asia/Dubai",
    };
    const defaults = computePrayerTimes(options);
    const selected = computePrayerTimes({ ...options, method: "Makkah", madhab: "hanafi" });
    expect(selected.asr.getTime()).toBeGreaterThan(defaults.asr.getTime());
    expect(selected.isha).not.toEqual(defaults.isha);
  });

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
