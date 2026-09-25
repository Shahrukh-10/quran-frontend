#!/usr/bin/env node
/**
 * IndexNow BULK ping — post-Layer-2-fatten-deploy priority push.
 *
 * Sends the top ~500 URLs to Bing/Yandex IndexNow to accelerate re-crawl after
 * a major on-page SEO update (deep-page content fattening + decorative bg
 * moved to client-only). Larger surface than scripts/indexnow-ping.mjs which
 * only nudges ~28 top URLs.
 *
 * Google does NOT participate in IndexNow — for Google, we rely on GSC
 * sitemap re-fetch (submit sitemap.xml manually in GSC after this ping) plus
 * the regular re-crawl cycle.
 *
 * Env:
 *   INDEXNOW_KEY   32-char hex key (also filename under /public/)
 *
 * Usage:
 *   INDEXNOW_KEY=... node scripts/indexnow-ping-bulk.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  console.error("[indexnow-bulk] INDEXNOW_KEY env not set — aborting");
  process.exit(1);
}

const HOST = "qurandaily.org";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// Load surahs
const surahs = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "quran", "surahs.json"), "utf8"),
);
const names = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "names.json"), "utf8"),
);
const duas = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "duas", "duas.json"), "utf8"),
);

const urls = [];

// 1. Core & hubs
urls.push(
  ...[
    "/",
    "/about",
    "/sources",
    "/privacy",
    "/quran",
    "/hadith",
    "/duas",
    "/prayer-times",
    "/qibla",
    "/learn-salah",
    "/names-of-allah",
    "/calendar",
    "/mushaf",
    "/adhan",
    "/tools",
    "/reverts",
    "/ramadan",
    "/hajj",
    "/seerah",
  ],
);

// 2. All 114 surah index pages
for (const s of surahs) {
  urls.push(`/quran/${s.slug}`);
}

// 3. Al-Fatihah + Yaseen + Ar-Rahman + Al-Mulk + Al-Kahf + Al-Waqiah — every ayah
//    (These are the high-traffic surahs by universal search demand)
const highDemandSurahs = ["al-fatihah", "yaseen", "ar-rahman", "al-mulk", "al-kahf", "al-waqiah"];
for (const slug of highDemandSurahs) {
  const s = surahs.find((x) => x.slug === slug);
  if (!s) continue;
  for (let a = 1; a <= s.ayahCount; a++) {
    urls.push(`/quran/${slug}/${a}`);
  }
}

// 4. First 20 ayat of every other surah (breadth signal)
for (const s of surahs) {
  if (highDemandSurahs.includes(s.slug)) continue;
  const cap = Math.min(s.ayahCount, 5); // 5 per non-high-demand surah = ~540 more
  for (let a = 1; a <= cap; a++) {
    urls.push(`/quran/${s.slug}/${a}`);
  }
}

// 5. All 6 hadith books
for (const book of ["bukhari", "muslim", "abudawud", "tirmidhi", "nasai", "ibnmajah"]) {
  urls.push(`/hadith/${book}`);
  // First 10 hadith of each book
  for (let n = 1; n <= 10; n++) {
    urls.push(`/hadith/${book}/${n}`);
  }
}

// 6. All 99 names
for (const n of names) {
  urls.push(`/names-of-allah/${n.slug}`);
}

// 7. All dua categories + all dua detail pages
const seenCats = new Set();
for (const d of duas.duas || []) {
  if (!seenCats.has(d.category)) {
    urls.push(`/duas/${d.category}`);
    seenCats.add(d.category);
  }
  urls.push(`/duas/${d.category}/${d.slug}`);
}

// 8. Top ~40 prayer-times cities by search intent
const priorityCities = [
  "makkah",
  "madinah",
  "istanbul",
  "jakarta",
  "dubai",
  "karachi",
  "london",
  "new-york",
  "los-angeles",
  "chicago",
  "toronto",
  "cairo",
  "riyadh",
  "jeddah",
  "kuala-lumpur",
  "singapore",
  "sydney",
  "melbourne",
  "birmingham",
  "manchester",
  "paris",
  "berlin",
  "amsterdam",
  "rome",
  "madrid",
  "moscow",
  "istanbul",
  "ankara",
  "tehran",
  "baghdad",
  "damascus",
  "beirut",
  "amman",
  "tunis",
  "algiers",
  "casablanca",
  "lagos",
  "cape-town",
  "mumbai",
  "delhi",
  "hyderabad",
  "dhaka",
  "lahore",
  "islamabad",
  "kabul",
];
for (const c of priorityCities) {
  urls.push(`/prayer-times/${c}`);
}

// Convert to absolute HTTPS URLs, dedupe, drop trailing slashes (except root)
const abs = [
  ...new Set(
    urls.map((u) => {
      if (u === "/") return `https://${HOST}/`;
      const clean = u.replace(/\/+$/, "");
      return `https://${HOST}${clean}`;
    }),
  ),
];

// IndexNow max is 10,000 per request; we'll batch at 500 to be conservative.
const BATCH = 500;
console.log(`[indexnow-bulk] Prepared ${abs.length} URLs; batching at ${BATCH}`);

async function pingBatch(endpoint, urlList) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "QuranDaily-IndexNow/2.0",
      },
      body,
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, err: String(e) };
  }
}

const ENDPOINTS = [
  "https://www.bing.com/indexnow",
  "https://api.indexnow.org/indexnow",
  "https://yandex.com/indexnow",
];

async function main() {
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < abs.length; i += BATCH) {
    const chunk = abs.slice(i, i + BATCH);
    console.log(
      `\n[indexnow-bulk] Batch ${Math.floor(i / BATCH) + 1} — ${chunk.length} URLs`,
    );
    for (const ep of ENDPOINTS) {
      const res = await pingBatch(ep, chunk);
      const ep_host = new URL(ep).host;
      if (res.ok) {
        console.log(`  ${ep_host}: HTTP ${res.status} ✓`);
        ok++;
      } else {
        console.log(
          `  ${ep_host}: HTTP ${res.status} ✗${res.err ? " — " + res.err : ""}`,
        );
        fail++;
      }
    }
    // Rate-limit friendliness — pause between batches
    if (i + BATCH < abs.length) await new Promise((r) => setTimeout(r, 3000));
  }
  console.log(
    `\n[indexnow-bulk] Done. ${ok} endpoint-batches accepted, ${fail} failed. Total URLs: ${abs.length}`,
  );
}

main();
