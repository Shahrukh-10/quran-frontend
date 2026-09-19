// Central list of supported locales. Add a locale here ONLY when a native reviewer is confirmed
// (see docs/DECISIONS.md — 2026-09-18 — English + Indonesian only at launch).
export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// RTL locales — set dir="rtl" on <html>.
export const rtlLocales: readonly Locale[] = [];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
