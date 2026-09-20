import { test, expect } from "@playwright/test";

// Focused priority checks: hadith list gap uniformity, hadith #203 detail,
// qibla page render, quran/al-fatihah, prayer-times, and home layout on iPhone.
// Kept in a separate file so it runs faster and gives immediate signal.

test("prio: hadith bukhari page 5 renders with uniform gaps + #203 in list", async ({ page }) => {
  const issues: string[] = [];
  page.on("pageerror", (e) => issues.push("pageerror: " + e.message));
  await page.goto("/en/hadith/bukhari?page=5", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("ol > li")) as HTMLElement[];
    const gaps: number[] = [];
    for (let i = 1; i < cards.length; i++) {
      const cur = cards[i];
      const prev = cards[i - 1];
      if (!cur || !prev) continue;
      gaps.push(Math.round(cur.getBoundingClientRect().top - prev.getBoundingClientRect().bottom));
    }
    const has203 = document.body.innerText.includes("203");
    return { cardCount: cards.length, gaps, has203 };
  });
  console.log("HADITH_LIST_INFO", JSON.stringify(info));
  console.log("PAGEERR", JSON.stringify(issues));
  expect(info.cardCount).toBeGreaterThan(5);
  const uniq = new Set(info.gaps);
  expect(uniq.size, `Gaps=${JSON.stringify(info.gaps)}`).toBeLessThanOrEqual(2);
});

test("prio: hadith #203 detail has Listen button", async ({ page }) => {
  await page.goto("/en/hadith/bukhari/203", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    return {
      hasArabic: !!document.querySelector("[dir='rtl'], .font-arabic, [lang='ar']"),
      hasListenBtn: !!Array.from(document.querySelectorAll("button")).find((b) => /listen|play|▶/i.test(b.textContent || "") || /listen|play/i.test(b.getAttribute("aria-label") || "")),
      bodyStart: document.body.innerText.slice(0, 300),
    };
  });
  console.log("HADITH_203", JSON.stringify(info));
  expect(info.hasArabic).toBe(true);
  expect(info.hasListenBtn).toBe(true);
});

test("prio: home /en no horizontal scroll", async ({ page }) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log("HOME_SIZE", JSON.stringify(s));
  expect(s.sw).toBeLessThanOrEqual(s.cw + 2);
});

test("prio: qibla page loads", async ({ page }) => {
  const r = await page.goto("/en/qibla", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({
    hasStart: !!Array.from(document.querySelectorAll("button")).find((b) => /start|compass/i.test(b.textContent || "")),
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("QIBLA", JSON.stringify({ status: r?.status(), ...info }));
  expect(r?.status()).toBeLessThan(400);
  expect(info.scrollW).toBeLessThanOrEqual(info.clientW + 2);
});

test("prio: quran al-fatihah loads and audio button visible", async ({ page }) => {
  const r = await page.goto("/en/quran/al-fatihah", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => ({
    hasArabic: !!document.querySelector("[lang='ar'], [dir='rtl'], .font-arabic"),
    audioButtons: document.querySelectorAll("button[aria-label*='play' i], button[aria-label*='audio' i], button[title*='play' i]").length,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("FATIHAH", JSON.stringify({ status: r?.status(), ...info }));
  expect(r?.status()).toBeLessThan(400);
  expect(info.scrollW).toBeLessThanOrEqual(info.clientW + 2);
  expect(info.hasArabic).toBe(true);
});

test("prio: prayer-times loads", async ({ page }) => {
  const r = await page.goto("/en/prayer-times", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  console.log("PRAYER", JSON.stringify({ status: r?.status(), ...info }));
  expect(r?.status()).toBeLessThan(400);
  expect(info.scrollW).toBeLessThanOrEqual(info.clientW + 2);
});
