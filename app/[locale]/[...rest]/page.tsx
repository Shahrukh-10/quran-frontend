import { notFound } from "next/navigation";

// Catch-all inside [locale]. Its only job is to call notFound() so that
// the closest not-found boundary (app/[locale]/not-found.tsx) is used
// instead of the root app/not-found.tsx. Without this, Next.js falls
// through to the root not-found when middleware rewrites /foo → /en/foo
// and no page.tsx matches — losing the site chrome, i18n, and metadata.
//
// See: https://next-intl.dev/docs/environments/error-files#not-foundjs
//
// IMPORTANT (Google-Search-Essentials fix): force-dynamic is required so
// that notFound() actually sets HTTP 404. Without this, Next.js's static
// prerender path renders the not-found UI but returns HTTP 200 — a
// classic soft-404 pattern that Google penalises heavily (flags as
// "Duplicate, Google chose different canonical").

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CatchAllNotFound(): never {
  notFound();
}
