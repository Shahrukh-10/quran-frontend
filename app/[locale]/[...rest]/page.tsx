import { notFound } from "next/navigation";

// Catch-all inside [locale]. Its only job is to invoke notFound() so the
// closest not-found boundary (app/[locale]/not-found.tsx) renders,
// keeping the site chrome + i18n + locale-aware 404 metadata.

export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function CatchAllNotFound(): never {
  notFound();
}
