import { notFound } from "next/navigation";

// Catch-all inside [locale]. Its only job is to call notFound() so that
// the closest not-found boundary (app/[locale]/not-found.tsx) is used
// instead of the root app/not-found.tsx. Without this, Next.js falls
// through to the root not-found when middleware rewrites /foo → /en/foo
// and no page.tsx matches — losing the site chrome, i18n, and metadata.
//
// See: https://next-intl.dev/docs/environments/error-files#not-foundjs
export default function CatchAllNotFound(): never {
  notFound();
}
