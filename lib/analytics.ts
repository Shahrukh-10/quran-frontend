"use client";

// GA4 event tracker — thin wrapper around gtag('event', ...) that only
// fires when the analytics script is loaded (checks window.gtag). Safe
// to import from any client component; server components should not
// call this (there's no window). No PII in any event.

const CONVERSION_EVENTS = new Set([
  "read_ayah",
  "read_hadith",
  "play_adhan",
  "open_qibla",
  "check_prayer_times",
  "install_pwa",
  "toggle_translation",
  "search_query",
]);

type EventName = string;
type EventParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: EventName, params?: EventParams): void {
  if (typeof window === "undefined") return;
  // biome-ignore lint/suspicious/noExplicitAny: gtag is a global function attached by @next/third-parties
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  // Sanitize: strip undefined values
  const clean: EventParams = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  gtag("event", name, clean);
}

// Convenience: mark an event as a GA4 "conversion" (mapped in GA4 admin).
// For now this is just a plain event call; the GA4 Admin UI is where you
// mark these names as key events for goal tracking.
export function trackConversion(name: EventName, params?: EventParams): void {
  trackEvent(name, params);
}

/** Type-checked helper for the events we've defined as conversion-worthy. */
export function trackKnownConversion(
  name:
    | "read_ayah"
    | "read_hadith"
    | "play_adhan"
    | "open_qibla"
    | "check_prayer_times"
    | "install_pwa"
    | "toggle_translation"
    | "search_query",
  params?: EventParams,
): void {
  if (!CONVERSION_EVENTS.has(name)) return;
  trackEvent(name, params);
}
