// Qibla bearing — pure math, no API required.
// The great-circle initial bearing from any point (lat, lon) to the Kaaba in Makkah.
// Reference: https://www.movable-type.co.uk/scripts/latlong.html
//
// Kaaba coordinates: 21.4225° N, 39.8262° E (widely used, ± 1m precision).

export const KAABA = { lat: 21.422487, lon: 39.826206 } as const;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Initial bearing (0..360, clockwise from true north) from `(lat, lon)` to the Kaaba.
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
 * Great-circle distance to the Kaaba, in kilometers (Haversine).
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
