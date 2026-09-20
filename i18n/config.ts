// Central list of supported locales. Add a locale here ONLY when a native reviewer is confirmed
// (see docs/DECISIONS.md).
//   - en: English (default)
//   - id: Bahasa Indonesia
//   - ar: Arabic (RTL) — site shell seeded 2026-09; full content translation pending
//   - ur: Urdu (RTL) — site shell seeded 2026-09
//   - tr: Turkish — site shell seeded 2026-09
//   - fr: French — site shell seeded 2026-09
export const locales = ["en", "id", "ar", "ur", "tr", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// RTL locales — set dir="rtl" on <html>. Layout should also flip flexbox
// alignment where appropriate; Tailwind ships `rtl:` variants for this.
export const rtlLocales: readonly Locale[] = ["ar", "ur"];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
