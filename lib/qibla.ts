// Qibla bearing — pure math, no API required.
// The great-circle initial bearing from any point (lat, lon) to the Kaʿbah in Makkah.
// Reference: https://www.movable-type.co.uk/scripts/latlong.html
//
// Kaʿbah coordinates: 21.422487° N, 39.826206° E (widely used, ± 1m precision).

import geomagnetism from "geomagnetism";

export const KAABA = { lat: 21.422487, lon: 39.826206 } as const;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Initial bearing (0..360, clockwise from true north) from `(lat, lon)` to the Kaʿbah.
 *
 * Verified against published reference values (IslamicFinder, Qibla-Direction.org):
 *   New York → 58.48° (ref 58.5°)   London → 118.99° (ref 118.9°)
 *   Delhi    → 266.60° (ref 267°)   Jakarta → 295.15° (ref 295.1°)
 *   Sydney   → 277.50° (ref 277.5°) Istanbul → 151.62° (ref 151.7°)
 * Every point matches within 1° — well inside the ± angular precision that
 * matters for prayer alignment (a straight body is ~30 cm wide at arm's
 * length; ± 5° of bearing corresponds to that error at ~3.4 m distance).
 */
export function qiblaBearing(lat: number, lon: number): number {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const dLon = toRad(KAABA.lon - lon);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Magnetic declination at (lat, lon), in degrees.
 *
 * Positive = magnetic north is EAST of true north.
 * Negative = magnetic north is WEST of true north.
 *
 * Computed via the World Magnetic Model (WMM) using the `geomagnetism` npm
 * package (Apache-2.0, NOAA WMM coefficients). Verified 2026-09 against the
 * NOAA online calculator (ngdc.noaa.gov/geomag/calculators/magcalc.shtml)
 * within 1° at eight reference cities — the stated WMM accuracy globally.
 *
 * WHY THIS MATTERS FOR QIBLA:
 * Most Android phones report `DeviceOrientationEvent.alpha` referenced to
 * MAGNETIC north, not true north. If we treat that value as true north the
 * Qibla arrow can be off by 10-15° in North America, up to 20° in Alaska /
 * northern Europe, and even more near the poles. iOS Safari reports
 * `webkitCompassHeading` already corrected to true north — do not apply
 * declination on top.
 */
export function magneticDeclination(lat: number, lon: number, date: Date = new Date()): number {
  const info = geomagnetism.model(date).point([lat, lon]);
  return info.decl;
}

/**
 * Convert a magnetic-north-referenced heading (0..360) to a true-north-
 * referenced heading at the given location. Wraps into [0, 360).
 *
 * True heading = magnetic heading + declination.
 *   (Example, New York: declination ≈ -13°. If your phone reports 100°
 *    magnetic, you're actually facing 100 + (-13) = 87° true.)
 */
export function magneticToTrue(magneticDeg: number, lat: number, lon: number, date: Date = new Date()): number {
  const decl = magneticDeclination(lat, lon, date);
  return ((magneticDeg + decl) % 360 + 360) % 360;
}

/**
 * Great-circle distance to the Kaʿbah, in kilometers (Haversine formula).
 */
export function distanceToKaabaKm(lat: number, lon: number): number {
  const R = 6371;
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const dPhi = toRad(KAABA.lat - lat);
  const dLambda = toRad(KAABA.lon - lon);
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compass rose label (N, NE, E, SE, S, SW, W, NW) for a bearing.
 */
export function compassLabel(bearing: number): string {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const idx = Math.round(bearing / 45) % 8;
  return labels[idx] ?? "N";
}
