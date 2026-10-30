// Prayer time computation via the `adhan` library (installed as a dependency).
// All calculation happens client-side; user location never leaves the device.
//
// This module is written to be safe to import from a client component. Do not import
// server-only APIs here.

import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from "adhan";

export type MethodId =
  | "MWL"
  | "ISNA"
  | "Egyptian"
  | "Makkah"
  | "Karachi"
  | "Tehran"
  | "Dubai"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Turkey"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Other";

export const METHODS: ReadonlyArray<{ id: MethodId; label: string }> = [
  { id: "MWL", label: "Muslim World League" },
  { id: "ISNA", label: "Islamic Society of North America (ISNA)" },
  { id: "Egyptian", label: "Egyptian General Authority" },
  { id: "Makkah", label: "Umm al-Qura (Saudi Arabia)" },
  { id: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { id: "Tehran", label: "Institute of Geophysics, Tehran" },
  { id: "Dubai", label: "Dubai (UAE)" },
  { id: "Kuwait", label: "Kuwait" },
  { id: "Qatar", label: "Qatar" },
  { id: "Singapore", label: "Singapore (MUIS)" },
  { id: "Turkey", label: "Turkey (Diyanet)" },
  { id: "MoonsightingCommittee", label: "Moonsighting Committee" },
  { id: "NorthAmerica", label: "North America (ISNA)" },
];

function paramsFor(method: MethodId) {
  switch (method) {
    case "MWL":
      return CalculationMethod.MuslimWorldLeague();
    case "ISNA":
      return CalculationMethod.NorthAmerica();
    case "Egyptian":
      return CalculationMethod.Egyptian();
    case "Makkah":
      return CalculationMethod.UmmAlQura();
    case "Karachi":
      return CalculationMethod.Karachi();
    case "Tehran":
      return CalculationMethod.Tehran();
    case "Dubai":
      return CalculationMethod.Dubai();
    case "Kuwait":
      return CalculationMethod.Kuwait();
    case "Qatar":
      return CalculationMethod.Qatar();
    case "Singapore":
      return CalculationMethod.Singapore();
    case "Turkey":
      return CalculationMethod.Turkey();
    case "MoonsightingCommittee":
      return CalculationMethod.MoonsightingCommittee();
    case "NorthAmerica":
      return CalculationMethod.NorthAmerica();
    default:
      return CalculationMethod.Other();
  }
}

export type ComputedTimes = {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

export function prayerDateInTimezone(instant: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(year, month - 1, day, 12);
}

export function computePrayerTimes(opts: {
  lat: number;
  lon: number;
  date?: Date;
  timeZone?: string;
  method?: MethodId;
  madhab?: "shafi" | "hanafi";
}): ComputedTimes {
  const params = paramsFor(opts.method ?? "MWL");
  params.madhab = opts.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  // High-latitude rule protects users north of ~48° so Fajr / Isha are computable.
  params.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight;
  const coords = new Coordinates(opts.lat, opts.lon);
  const instant = opts.date ?? new Date();
  const date = opts.timeZone ? prayerDateInTimezone(instant, opts.timeZone) : instant;
  const times = new PrayerTimes(coords, date, params);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
}

// Determine which prayer is "next" from a given moment in the day's schedule.
export function nextPrayer(now: Date, times: ComputedTimes): keyof ComputedTimes | null {
  const order: Array<keyof ComputedTimes> = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  for (const k of order) {
    if (times[k].getTime() > now.getTime()) return k;
  }
  return null;
}

// Format times in the user's locale. Kept here so components stay dumb.
// Uses 12-hour clock (e.g. "6:12 AM") — the standard for prayer times in
// most of the Muslim world (India/Pakistan/Bangladesh/Gulf/Southeast Asia).
export function formatLocalTime(d: Date, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}
