"use client";
// Zero-render client component. Records that the user opened a reader view today.
// Meant to be dropped into reader layouts (Quran ayah page, mushaf, etc.) so we
// can update the reading streak without touching every page's server tree.
// Wiring into layouts is deliberately deferred — this file only ships the hook.

import { recordReadingActivity } from "@/lib/storage";
import { useEffect } from "react";

export function ActivityTracker() {
  useEffect(() => {
    // Guard against non-browser execution paths (RSC prerender, workers).
    // storage.ts already no-ops on the server, but keep the check here so the
    // side effect is unambiguously client-only for future readers.
    if (typeof window === "undefined") return;
    recordReadingActivity();
  }, []);

  return null;
}
