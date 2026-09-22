// Absolute URL helper — used for canonical, OG, sitemap.
//
// Trailing-slash policy (audited 2026-09-20): every canonical on non-root
// content pages ships WITHOUT a trailing slash (e.g. `/quran/al-fatihah`,
// `/duas`, `/prayer-times`). The ONE exception is the site root: previously
// this helper produced `http://localhost:3000` (bare host, no path) for
// `siteUrl("/")`, which caused Search Console to flag `/` as a duplicate of
// the bare-host canonical. We now always keep a trailing slash on the root
// so `/` canonicalises to `http://<host>/` consistently.
export function siteUrl(path = "/"): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const cleanBase = base.replace(/\/$/, "");
  // Root ("/") always keeps its slash → "<host>/". All other paths
  // ship as-is so we preserve the existing no-trailing-slash policy.
  return `${cleanBase}${normalized}`;
}

export const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Quran Daily";
