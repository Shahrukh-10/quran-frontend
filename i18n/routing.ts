import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  // Default locale (en) has no prefix; others do — matches docs/ARCHITECTURE.md.
  localePrefix: "as-needed",
  // Always render the default locale on unprefixed URLs. Ignore the
  // NEXT_LOCALE cookie and the Accept-Language header — users only see a
  // non-English locale when the URL explicitly carries a prefix (/fr, /ar, …),
  // which the locale switcher sets.
  localeDetection: false,
});

// Type-safe navigation wrappers that respect the current locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
