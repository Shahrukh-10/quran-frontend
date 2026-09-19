import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  // Default locale (en) has no prefix; others do — matches docs/ARCHITECTURE.md.
  localePrefix: "as-needed",
});

// Type-safe navigation wrappers that respect the current locale.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
