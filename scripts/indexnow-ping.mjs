#!/usr/bin/env node
/**
 * IndexNow ping — notify Bing + Yandex about new/updated URLs.
 *
 * Called from the CI deploy workflow after a successful build. Reads a
 * curated list of high-value URLs (homepage + top sections + top surahs)
 * and posts them to the IndexNow endpoint. Google does not participate in
 * IndexNow — for Google we rely on Search Console's regular re-crawl of
 * the sitemap index + priority indexing requests.
 *
 * IndexNow protocol: https://www.indexnow.org/documentation
 * Verification: the key file at /public/<key>.txt must return exactly the
 * key contents, or the ping is rejected.
 *
 * Env:
 *   INDEXNOW_KEY  32-char hex key (also the filename under /public/)
 */

const KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  console.error("[indexnow] INDEXNOW_KEY env not set — skipping");
  process.exit(0);
}

const HOST = "qurandaily.org";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Top-priority URLs to push. Bing + Yandex will crawl the rest from
// sitemap.xml on their own schedule; IndexNow is our nudge for the
// pages that matter most for ranking.
const URL_LIST = [
  // Site core
  "https://qurandaily.org/",
  "https://qurandaily.org/about",
  "https://qurandaily.org/sources",
  // Section hubs
  "https://qurandaily.org/quran",
  "https://qurandaily.org/hadith",
  "https://qurandaily.org/duas",
  "https://qurandaily.org/prayer-times",
  "https://qurandaily.org/qibla",
  "https://qurandaily.org/learn-salah",
  "https://qurandaily.org/names-of-allah",
  "https://qurandaily.org/calendar",
  // Top surahs by traffic potential
  "https://qurandaily.org/quran/al-fatihah",
  "https://qurandaily.org/quran/al-baqarah",
  "https://qurandaily.org/quran/yaseen",
  "https://qurandaily.org/quran/ar-rahman",
  "https://qurandaily.org/quran/al-mulk",
  "https://qurandaily.org/quran/al-kahf",
  "https://qurandaily.org/quran/al-waqiah",
  // Top hadith books
  "https://qurandaily.org/hadith/bukhari",
  "https://qurandaily.org/hadith/muslim",
  // Top cities (prayer times high-intent)
  "https://qurandaily.org/prayer-times/makkah",
  "https://qurandaily.org/prayer-times/madinah",
  "https://qurandaily.org/prayer-times/istanbul",
  "https://qurandaily.org/prayer-times/jakarta",
  "https://qurandaily.org/prayer-times/dubai",
  "https://qurandaily.org/prayer-times/karachi",
  "https://qurandaily.org/prayer-times/london",
  "https://qurandaily.org/prayer-times/new-york",
];

async function pingEndpoint(endpoint, urls) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "QuranDaily-IndexNow/1.0",
      },
      body,
    });
    const text = await r.text();
    console.log(
      `[indexnow] ${endpoint} → HTTP ${r.status}` + (text ? ` — ${text.slice(0, 200)}` : ""),
    );
    return r.status < 400;
  } catch (e) {
    console.error(`[indexnow] ${endpoint} → error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`[indexnow] pinging ${URL_LIST.length} URLs`);
  console.log(`[indexnow] key location: ${KEY_LOCATION}`);
  // IndexNow's spec allows any participating endpoint to receive the batch
  // and it federates the notification. We ping the two most-used endpoints
  // (Bing + Yandex) explicitly for reliability.
  const endpoints = ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow", "https://yandex.com/indexnow"];
  const results = await Promise.all(endpoints.map((e) => pingEndpoint(e, URL_LIST)));
  const okCount = results.filter(Boolean).length;
  console.log(`[indexnow] done — ${okCount}/${endpoints.length} endpoints accepted`);
  // Never fail the deploy over IndexNow — it's best-effort
  process.exit(0);
}

main();
