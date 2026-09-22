import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

// Catch-all inside [locale] — the "true 404" implementation.
//
// This route is hit ONLY when nothing else matched, so every render is a
// 404. We can't just call notFound() (Next 15 renders the boundary UI but
// serves 200 in static-prerender mode — soft-404 anti-pattern that
// Google mass-demotes).
//
// The reliable path: force fully-dynamic rendering AND call notFound() —
// notFound() throws NEXT_NOT_FOUND which Next 15 handles correctly
// (renders not-found.tsx + emits HTTP 404) whenever the caller was NOT
// prerendered.
//
// export const dynamic = "force-dynamic" ensures this branch is never
// prerendered, so notFound()'s 404 status propagates all the way to the
// wire.

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export function generateMetadata(): Metadata {
  return {
    title: "Page not found",
    description: "The page you were looking for does not exist.",
    robots: { index: false, follow: false },
  };
}

type Props = { params: Promise<{ locale: string; rest?: string[] }> };

export default async function CatchAllNotFound({ params }: Props): Promise<never> {
  const { locale } = await params;
  setRequestLocale(locale);
  // Read a header to force the runtime to treat this as a fully dynamic
  // request — this defeats any residual static optimization Next might
  // apply, and makes notFound() genuinely return a 404 status.
  await headers();
  notFound();
}
