// Shared clean-404 handler for known root paths that crawlers and SEO tools
// probe (sitemap fallbacks, llms-full.txt, index.md). These paths contain a
// dot, so the locale middleware matcher (which excludes `.*\..*`) skips them;
// with no matching route they hit the Cloudflare adapter's error boundary and
// return HTTP 500. A 500 makes crawlers back off (vs simply skipping a 404),
// so we answer a proper 404 instead. Re-exported by each app/<path>/route.ts.
export function GET(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
