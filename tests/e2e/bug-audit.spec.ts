import { test, devices } from "@playwright/test";

// Diagnostic to see actual runtime layout of bug pages.
test("audit: names-of-allah mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/en/names-of-allah", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const card = document.querySelector(".name-card") as HTMLElement | null;
    if (!card) return { err: "no card" };
    const ar = card.querySelector(".name-ar") as HTMLElement | null;
    const en = card.querySelector(".name-en") as HTMLElement | null;
    const tr = card.querySelector(".name-translit") as HTMLElement | null;
    return {
      viewport: window.innerWidth,
      card: {
        rect: card.getBoundingClientRect().toJSON(),
        display: getComputedStyle(card).display,
        flexDir: getComputedStyle(card).flexDirection,
        textAlign: getComputedStyle(card).textAlign,
        direction: getComputedStyle(card).direction,
      },
      ar: ar
        ? {
            rect: ar.getBoundingClientRect().toJSON(),
            fontSize: getComputedStyle(ar).fontSize,
            textAlign: getComputedStyle(ar).textAlign,
            direction: getComputedStyle(ar).direction,
          }
        : null,
      en: en
        ? {
            rect: en.getBoundingClientRect().toJSON(),
            fontSize: getComputedStyle(en).fontSize,
            textAlign: getComputedStyle(en).textAlign,
          }
        : null,
      tr: tr
        ? {
            rect: tr.getBoundingClientRect().toJSON(),
            fontSize: getComputedStyle(tr).fontSize,
          }
        : null,
    };
  });
  // biome-ignore lint/suspicious/noConsole: diag
  console.log("NAMES:", JSON.stringify(info, null, 2));
});

test("audit: quran surah row layout at 3 widths", async ({ page }) => {
  for (const w of [375, 720, 1280]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto("/en/quran", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const info = await page.evaluate((width) => {
      const row = document.querySelector("li.row") as HTMLElement | null;
      const link = row?.querySelector("a.row__link") as HTMLElement | null;
      const num = link?.querySelector(".row__num") as HTMLElement | null;
      const main = link?.querySelector(".row__main") as HTMLElement | null;
      const arabic = link?.querySelector(".row__arabic") as HTMLElement | null;
      return {
        w: width,
        link: link
          ? {
              disp: getComputedStyle(link).display,
              grid: getComputedStyle(link).gridTemplateColumns,
              rect: link.getBoundingClientRect().toJSON(),
            }
          : null,
        num: num ? { rect: num.getBoundingClientRect().toJSON() } : null,
        main: main ? { rect: main.getBoundingClientRect().toJSON() } : null,
        arabic: arabic ? { rect: arabic.getBoundingClientRect().toJSON() } : null,
      };
    }, w);
    // biome-ignore lint/suspicious/noConsole: diag
    console.log("QURAN@" + w + ":", JSON.stringify(info, null, 2));
  }
});

test("audit: prayer-times makkah settings visible", async ({ page }) => {
  await page.goto("/en/prayer-times/makkah", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const summary = document.querySelector("summary");
    return {
      summaryText: summary?.textContent ?? null,
      detailsCount: document.querySelectorAll("details").length,
      calcSelect: (document.querySelector("select") as HTMLSelectElement | null)?.value ?? null,
      errors: (window as any).__pageErrors ?? [],
    };
  });
  // biome-ignore lint/suspicious/noConsole: diag
  console.log("MAKKAH:", JSON.stringify(info, null, 2));

  // Try to change method and see if Fajr updates
  await page.evaluate(() => {
    const sum = document.querySelector("summary") as HTMLElement | null;
    sum?.click();
  });
  await page.waitForTimeout(300);
  const fajr1 = await page.evaluate(
    () => (document.querySelector(".tabular-nums") as HTMLElement | null)?.innerText,
  );
  await page.selectOption("select", { index: 3 });
  await page.waitForTimeout(400);
  const fajr2 = await page.evaluate(
    () => (document.querySelector(".tabular-nums") as HTMLElement | null)?.innerText,
  );
  // biome-ignore lint/suspicious/noConsole: diag
  console.log("FAJR_BEFORE_AFTER:", fajr1, "->", fajr2);
});
