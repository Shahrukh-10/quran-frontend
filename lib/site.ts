// Absolute URL helper — used for canonical, OG, sitemap.
export function siteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${normalized}`;
}

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Islamic Website";
