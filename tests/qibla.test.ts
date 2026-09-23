// Sanity tests for the Qibla math and magnetic-declination correction.
// These tests exist because Qibla direction is a religious-correctness
// requirement — an off-by-15° silent bug is unacceptable. Any change to
// lib/qibla.ts must keep every one of these assertions green.
//
// Reference values sourced independently:
//   - Great-circle bearings verified against the movable-type.co.uk
//     calculator and IslamicFinder / Qibla-Direction.org published values.
//   - Magnetic declination verified against NOAA's online WMM calculator
//     (ngdc.noaa.gov/geomag/calculators/magcalc.shtml) 2026-09.
// WMM stated accuracy: ± 1° globally.

import { describe, expect, it } from "vitest";
import {
  KAABA,
  compassLabel,
  distanceToKaabaKm,
  magneticDeclination,
  magneticToTrue,
  qiblaBearing,
} from "../lib/qibla";

describe("qiblaBearing() — verified against published Islamic reference values", () => {
  // Each case is (city, lat, lon, published bearing, tolerance in degrees).
  const cases: Array<[string, number, number, number, number]> = [
    ["New York",   40.7128,  -74.0060,  58.5,  1.0],
    ["London",     51.5074,   -0.1278,  118.9, 1.0],
    ["Delhi",      28.6139,   77.2090,  267.0, 1.0],
    ["Jakarta",    -6.2088,  106.8456,  295.1, 1.0],
    ["Sydney",    -33.8688,  151.2093,  277.5, 1.0],
    ["Istanbul",   41.0082,   28.9784,  151.7, 1.0],
    ["Toronto",    43.6532,  -79.3832,   55.5, 1.0],
    ["Cairo",      30.0444,   31.2357,  136.1, 1.0],
    ["Los Angeles",34.0522, -118.2437,   23.9, 1.5],
    ["São Paulo", -23.5505,  -46.6333,   68.9, 1.0],
  ];
  for (const [name, lat, lon, expected, tol] of cases) {
    it(`${name}: bearing to Kaʿbah ≈ ${expected}° (± ${tol}°)`, () => {
      const b = qiblaBearing(lat, lon);
      expect(Math.abs(b - expected)).toBeLessThanOrEqual(tol);
    });
  }

  it("Kaʿbah itself returns a defined value (edge case, direction undefined)", () => {
    const b = qiblaBearing(KAABA.lat, KAABA.lon);
    expect(Number.isFinite(b)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe("distanceToKaabaKm() — Haversine great-circle distance", () => {
  it("Kaʿbah to itself is 0", () => {
    expect(distanceToKaabaKm(KAABA.lat, KAABA.lon)).toBeCloseTo(0, 3);
  });

  // Reference distances from https://www.movable-type.co.uk/scripts/latlong.html
  it("New York → Kaʿbah ≈ 10,300 km", () => {
    expect(distanceToKaabaKm(40.7128, -74.006)).toBeGreaterThan(10_000);
    expect(distanceToKaabaKm(40.7128, -74.006)).toBeLessThan(10_500);
  });
  it("London → Kaʿbah ≈ 4,700 km", () => {
    expect(distanceToKaabaKm(51.5074, -0.1278)).toBeGreaterThan(4_500);
    expect(distanceToKaabaKm(51.5074, -0.1278)).toBeLessThan(4_900);
  });
  it("Jakarta → Kaʿbah ≈ 7,900 km", () => {
    expect(distanceToKaabaKm(-6.2088, 106.8456)).toBeGreaterThan(7_800);
    expect(distanceToKaabaKm(-6.2088, 106.8456)).toBeLessThan(8_100);
  });
});

describe("compassLabel() — 8-point rose", () => {
  const cases: Array<[number, string]> = [
    [0,   "N"],
    [22,  "N"],
    [23,  "NE"],
    [45,  "NE"],
    [90,  "E"],
    [135, "SE"],
    [180, "S"],
    [225, "SW"],
    [270, "W"],
    [315, "NW"],
    [359, "N"],
  ];
  for (const [b, l] of cases) {
    it(`bearing ${b}° → "${l}"`, () => {
      expect(compassLabel(b)).toBe(l);
    });
  }
});

describe("magneticDeclination() — verified against NOAA WMM calculator", () => {
  // Reference values pulled 2026-09 from
  // https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml
  // Tolerance is 1.5° (WMM's stated ±1° plus 0.5° for site-vs-package epoch
  // drift over a year — the WMM package we use is compiled with the 2020-25
  // coefficient set).
  const cases: Array<[string, number, number, number, number]> = [
    ["Makkah",    21.4225,   39.8262,   3.5, 1.5],
    ["New York",  40.7128,  -74.0060, -13.0, 1.5],
    ["London",    51.5074,   -0.1278,   1.2, 1.5],
    ["Delhi",     28.6139,   77.2090,   0.6, 1.5],
    ["Jakarta",   -6.2088,  106.8456,   0.6, 1.5],
    ["Sydney",   -33.8688,  151.2093,  12.7, 1.5],
    ["Riyadh",    24.7136,   46.6753,   3.2, 1.5],
  ];
  for (const [name, lat, lon, expected, tol] of cases) {
    it(`${name}: declination ≈ ${expected}° (± ${tol}°)`, () => {
      const d = magneticDeclination(lat, lon);
      expect(Math.abs(d - expected)).toBeLessThanOrEqual(tol);
    });
  }
});

describe("magneticToTrue() — end-to-end correction", () => {
  it("adds the New York declination to a magnetic reading", () => {
    // In NY, if the phone reports 100° magnetic and decl is ≈ -13°,
    // the true bearing is 100 + (-13) = 87°.
    const trueBearing = magneticToTrue(100, 40.7128, -74.006);
    expect(trueBearing).toBeGreaterThan(85);
    expect(trueBearing).toBeLessThan(89);
  });

  it("wraps to [0, 360) on negative-magnetic input", () => {
    // 355° magnetic + Sydney's ~+13° declination = 368° → wraps to 8°.
    const trueBearing = magneticToTrue(355, -33.8688, 151.2093);
    expect(trueBearing).toBeGreaterThan(5);
    expect(trueBearing).toBeLessThan(11);
  });

  it("Makkah declination is small — result close to magnetic input", () => {
    // Declination ≈ 3.5°, so 90 → about 93.5°.
    const trueBearing = magneticToTrue(90, 21.4225, 39.8262);
    expect(trueBearing).toBeGreaterThan(92);
    expect(trueBearing).toBeLessThan(95);
  });
});
