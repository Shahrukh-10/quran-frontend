// Localized crumb helpers for BreadcrumbSchema (structured data).
//
// These names surface in Google search-result breadcrumb trails, so on
// Indonesian pages the crumbs must be Indonesian. Do not hardcode English
// crumb names in page files — use these helpers instead.
//
// Usage in a server component / metadata function:
//   const bc = await breadcrumbs(locale);
//   const items = [
//     { name: bc("home"), url: siteUrl("/") },
//     { name: bc("duas"), url: siteUrl("/duas") },
//     ...
//   ];
import { getTranslations } from "next-intl/server";

export type BreadcrumbKey =
  | "home"
  | "quran"
  | "duas"
  | "prayerTimes"
  | "qibla"
  | "learnSalah"
  | "learn"
  | "namesOfAllah"
  | "calendar"
  | "tools"
  | "settings"
  | "search"
  | "about"
  | "privacy"
  | "sources"
  | "mushaf"
  | "readPdf"
  | "wordByWord"
  | "browse"
  | "study"
  | "learningPlans"
  | "adhan"
  | "offline"
  | "hadith"
  | "seerah"
  | "reverts"
  | "ramadan"
  | "hajj"
  | "memorize"
  | "iqamah"
  | "account"
  | "install";

export async function breadcrumbs(locale: string): Promise<(key: BreadcrumbKey) => string> {
  const t = await getTranslations({ locale, namespace: "breadcrumb" });
  return (key) => t(key);
}
