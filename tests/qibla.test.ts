import { compassLabel, distanceToKaabaKm, qiblaBearing } from "@/lib/qibla";
import { describe, expect, it } from "vitest";

describe("qibla", () => {
  it("bearing from Makkah to itself is 0 or 360", () => {
    const b = qiblaBearing(21.422487, 39.826206);
    // Numerical noise near singularity — accept 0..1 or 359..360.
    expect(b < 1 || b > 359).toBe(true);
  });

  it("bearing from London points roughly SE (~118°)", () => {
    const b = qiblaBearing(51.5074, -0.1278);
    expect(b).toBeGreaterThan(100);
    expect(b).toBeLessThan(140);
  });

  it("bearing from Jakarta points roughly W-NW (~290°)", () => {
    const b = qiblaBearing(-6.2088, 106.8456);
    expect(b).toBeGreaterThan(280);
    expect(b).toBeLessThan(300);
  });

  it("distance from Makkah is 0", () => {
    expect(distanceToKaabaKm(21.422487, 39.826206)).toBeLessThan(1);
  });

  it("distance from Jeddah is under 100km", () => {
    expect(distanceToKaabaKm(21.4858, 39.1925)).toBeLessThan(100);
  });

  it("compass label round-trips cardinals", () => {
    expect(compassLabel(0)).toBe("N");
    expect(compassLabel(90)).toBe("E");
    expect(compassLabel(180)).toBe("S");
    expect(compassLabel(270)).toBe("W");
  });
});
