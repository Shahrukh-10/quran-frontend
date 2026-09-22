import { notFound } from "next/navigation";

// Catch-all inside [locale]. Its only job is to invoke notFound() so the
// closest not-found boundary (app/[locale]/not-found.tsx) renders,
// keeping the site chrome + i18n + locale-aware 404 metadata.
//
// KNOWN LIMITATION: Next.js 15 with static build + notFound() serves
// this with HTTP 200 status even though the not-found UI is rendered.
// This is a "soft 404" that Google's docs explicitly say Google's own
// heuristics still recognise as a 404 (the not-found.tsx sets
// `robots: { index: false, follow: false }` in its metadata, and the
// visible copy says "Page not found" — Google downgrades these to
// soft-404 rather than indexing them).
//
// If a future Next.js release exposes a way to force HTTP 404 status
// on statically-prerendered notFound() calls, revisit this.

export default function CatchAllNotFound(): never {
  notFound();
}
