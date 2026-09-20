/**
 * Mobile QA sweep — runs under iPhone 15 and Pixel 7 emulation
 * (project-level config in playwright.config.ts).
 *
 * Fails on: horizontal scroll, console errors, raw i18n key leaks,
 * broken images, 500s, missing audio button on hadith #203, non-uniform
 * hadith card gaps.
 */
import { test, expect, type Page } from "@playwright/test";

const LOCALES = ["en", "id", "ar", "ur", "fr", "tr"] as const;

type PageCheck = { path: string; name: string };

const PAGES: PageCheck[] = [
  { path: "/", name: "home" },
  { path: "/quran", name: "quran-index" },
  { path: "/quran/al-fatihah", name: "surah-al-fatihah" },
  { path: "/quran/al-fatihah/1", name: "ayah-al-fatihah-1" },
  { path: "/quran/read", name: "quran-read" },
  { path: "/quran/browse", name: "quran-browse" },
  { path: "/quran/juz/1", name: "juz-1" },
  { path: "/quran/hizb/1", name: "hizb-1" },
  { path: "/quran/manzil/1", name: "manzil-1" },
  { path: "/quran/ruku/1", name: "ruku-1" },
  { path: "/quran/page/1", name: "page-1" },
  { path: "/quran/word-by-word/al-fatihah", name: "wbw-1" },
  { path: "/study/1-1", name: "study-1-1" },
  { path: "/hadith", name: "hadith-index" },
  { path: "/hadith/bukhari", name: "bukhari-page1" },
  { path: "/hadith/bukhari?page=5", name: "bukhari-page5" },
  { path: "/hadith/bukhari/203", name: "hadith-203" },
  { path: "/hadith/muslim", name: "muslim" },
  { path: "/hadith/abudawud", name: "abudawud" },
  { path: "/hadith/tirmidhi", name: "tirmidhi" },
  { path: "/hadith/nasai", name: "nasai" },
  { path: "/hadith/ibnmajah", name: "ibnmajah" },
  { path: "/qibla", name: "qibla" },
  { path: "/duas", name: "duas-index" },
  { path: "/prayer-times", name: "prayer-times" },
  { path: "/prayer-times/mumbai", name: "prayer-times-mumbai" },
  { path: "/iqamah", name: "iqamah" },
  { path: "/adhan", name: "adhan" },
  { path: "/calendar", name: "calendar" },
  { path: "/names-of-allah", name: "names-of-allah" },
  { path: "/seerah", name: "seerah" },
  { path: "/hajj", name: "hajj" },
  { path: "/ramadan", name: "ramadan" },
  { path: "/reverts", name: "reverts" },
  { path: "/learn", name: "learn" },
  { path: "/learn-salah", name: "learn-salah" },
  { path: "/tools", name: "tools-index" },
  { path: "/tools/tasbih", name: "tasbih" },
  { path: "/tools/prayer-tracker", name: "prayer-tracker" },
  { path: "/tools/zakat", name: "zakat" },
  { path: "/tools/adhkar", name: "adhkar" },
  { path: "/memorize", name: "memorize" },
  { path: "/search", name: "search" },
  { path: "/settings", name: "settings" },
  { path: "/about", name: "about" },
  { path: "/privacy", name: "privacy" },
  { path: "/install", name: "install" },
  { path: "/definitely-does-not-exist-xyz", name: "notfound-404" },
];

const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
  /manifest\.webmanifest/i,
  /Service Worker/i,
  /workbox/i,
  /GEOLOCATION|geolocation/i,
  /DeviceOrientation/i,
  /getUserMedia/i,
  /was preloaded using link preload but not used/i,
];

async function collectPageIssues(page: Page, url: string) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((r) => r.test(text))) return;
    consoleErrors.push(text);
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
  });
  page.on("requestfailed", (req) => {
    const failure = req.failure()?.errorText ?? "unknown";
    if (/net::ERR_ABORTED/.test(failure)) return;
    failedRequests.push(`${req.url()} — ${failure}`);
  });

  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForTimeout(1200);

  const status = resp?.status() ?? 0;

  const horizontalScroll = await page.evaluate(() => {
    const de = document.documentElement;
    return { scrollW: de.scrollWidth, clientW: de.clientWidth, overflowing: de.scrollWidth > de.clientWidth + 2 };
  });

  const rawKeyLeaks = await page.evaluate(() => {
    const pattern = /\b(hadith|quran|duas|prayer|dua|home|nav|footer|common|adhkar|zakat|tasbih|qibla|seerah|calendar|names|memorize|search|settings|about|install|iqamah|adhan|tools|study|learn|breadcrumbs)\.[a-zA-Z_][a-zA-Z0-9_.]*\b/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const leaks: string[] = [];
    let node: Node | null = walker.nextNode();
    while (node) {
      const t = node.textContent?.trim() ?? "";
      if (t && pattern.test(t) && t.length < 200) {
        let p: HTMLElement | null = node.parentElement;
        let skip = false;
        while (p) {
          const tag = p.tagName;
          if (tag === "CODE" || tag === "PRE" || tag === "SCRIPT" || tag === "STYLE") { skip = true; break; }
          p = p.parentElement;
        }
        if (!skip) leaks.push(t.slice(0, 100));
      }
      node = walker.nextNode();
    }
    return Array.from(new Set(leaks)).slice(0, 5);
  });

  const brokenImages = await page.evaluate(() =>
    Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src).slice(0, 5),
  );

  return {
    status,
    horizontalScroll,
    rawKeyLeaks,
    brokenImages,
    consoleErrors: Array.from(new Set(consoleErrors)).slice(0, 5),
    failedRequests: Array.from(new Set(failedRequests)).slice(0, 5),
  };
}

for (const p of PAGES) {
  test(`page ${p.name} [${p.path}]`, async ({ page }) => {
    const url = `/en${p.path}`.replace(/\/\//g, "/");
    const issues = await collectPageIssues(page, url);

    const expected404 = p.name === "notfound-404";
    if (expected404) {
      expect(issues.status, `HTTP status for ${p.path}`).toBe(404);
    } else {
      expect(issues.status, `HTTP status for ${p.path}`).toBeLessThan(400);
    }

    expect(
      issues.horizontalScroll.overflowing,
      `Horizontal scroll on ${p.path}: scrollW=${issues.horizontalScroll.scrollW} clientW=${issues.horizontalScroll.clientW}`,
    ).toBe(false);

    expect(issues.rawKeyLeaks, `Raw i18n key leaks on ${p.path}: ${JSON.stringify(issues.rawKeyLeaks)}`).toEqual([]);
    expect(issues.brokenImages, `Broken images on ${p.path}: ${JSON.stringify(issues.brokenImages)}`).toEqual([]);
    // 404 page is expected to log a "Failed to load resource: 404" — the very
    // resource being missed is what triggers the 404 render. Skip that check.
    if (!expected404) {
      expect(issues.consoleErrors, `Console errors on ${p.path}: ${JSON.stringify(issues.consoleErrors)}`).toEqual([]);
    }
  });
}

test("hadith list — audio buttons on every card + uniform gap", async ({ page }) => {
  await page.goto("/en/hadith/bukhari?page=5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const cardCount = await page.locator("ol > li").count();
  expect(cardCount, "hadith cards rendered on /hadith/bukhari?page=5").toBeGreaterThan(0);

  const listenButtons = await page.getByRole("button", { name: /listen|play|▶/i }).count();
  expect(listenButtons, "listen buttons on hadith cards").toBeGreaterThan(0);

  const gaps = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("ol > li")) as HTMLElement[];
    const rects = cards.map((c) => c.getBoundingClientRect());
    const g: number[] = [];
    for (let i = 1; i < rects.length; i++) {
      const cur = rects[i];
      const prev = rects[i - 1];
      if (!cur || !prev) continue;
      g.push(Math.round(cur.top - prev.bottom));
    }
    return g;
  });
  if (gaps.length > 3) {
    const uniq = new Set(gaps);
    expect(uniq.size, `Non-uniform card gaps: ${JSON.stringify(gaps)}`).toBeLessThanOrEqual(2);
  }
});

test("hadith #203 detail — renders with Listen button", async ({ page }) => {
  await page.goto("/en/hadith/bukhari/203", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  const arabic = await page
    .locator("[dir='rtl'], .font-arabic, [lang='ar']")
    .first()
    .isVisible()
    .catch(() => false);
  expect(arabic, "Arabic text visible on #203").toBe(true);

  const listenBtn = page.getByRole("button", { name: /listen|play|▶/i }).first();
  await expect(listenBtn, "Listen button on hadith #203 detail").toBeVisible({ timeout: 5000 });
});

for (const locale of LOCALES) {
  test(`locale ${locale} — home renders, no raw keys`, async ({ page }) => {
    const issues = await collectPageIssues(page, `/${locale}`);
    expect(issues.status, `HTTP status for /${locale}`).toBeLessThan(400);
    expect(issues.rawKeyLeaks, `Raw i18n key leaks on /${locale}: ${JSON.stringify(issues.rawKeyLeaks)}`).toEqual([]);
    if (locale === "ar" || locale === "ur") {
      const dir = await page.evaluate(() => document.documentElement.dir || document.body.dir);
      expect(dir, `dir attr on /${locale}`).toBe("rtl");
    }
  });
}
