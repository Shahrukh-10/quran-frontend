import { test } from "@playwright/test";

test("iPhone SE names-of-allah overlap check", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/en/names-of-allah", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const results = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".name-card")).slice(0, 5) as HTMLElement[];
    return cards.map((card, i) => {
      const ar = card.querySelector(".name-ar") as HTMLElement | null;
      const en = card.querySelector(".name-en") as HTMLElement | null;
      const tr = card.querySelector(".name-translit") as HTMLElement | null;
      const num = card.querySelector(".name-number") as HTMLElement | null;
      const arR = ar?.getBoundingClientRect();
      const enR = en?.getBoundingClientRect();
      const trR = tr?.getBoundingClientRect();
      const numR = num?.getBoundingClientRect();
      // overlap between ar and en:
      const overlap =
        arR && enR
          ? Math.max(0, Math.min(arR.bottom, enR.bottom) - Math.max(arR.top, enR.top))
          : null;
      return {
        i,
        card: card.getBoundingClientRect().toJSON(),
        ar: arR?.toJSON(),
        tr: trR?.toJSON(),
        en: enR?.toJSON(),
        num: numR?.toJSON(),
        arOverlapWithEn: overlap,
        arFontSize: ar ? getComputedStyle(ar).fontSize : null,
      };
    });
  });
  // biome-ignore lint/suspicious/noConsole: diag
  console.log("SE_NAMES:", JSON.stringify(results, null, 2));
});

test("iPhone 15 names-of-allah overlap check", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/en/names-of-allah", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const results = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".name-card")).slice(0, 3) as HTMLElement[];
    return cards.map((card, i) => {
      const ar = card.querySelector(".name-ar") as HTMLElement | null;
      const en = card.querySelector(".name-en") as HTMLElement | null;
      return {
        i,
        cardWidth: card.getBoundingClientRect().width,
        ar: ar
          ? {
              rect: ar.getBoundingClientRect().toJSON(),
              fontSize: getComputedStyle(ar).fontSize,
              textAlign: getComputedStyle(ar).textAlign,
              width: getComputedStyle(ar).width,
            }
          : null,
        en: en
          ? {
              rect: en.getBoundingClientRect().toJSON(),
              fontSize: getComputedStyle(en).fontSize,
              textAlign: getComputedStyle(en).textAlign,
            }
          : null,
      };
    });
  });
  // biome-ignore lint/suspicious/noConsole: diag
  console.log("IP15_NAMES:", JSON.stringify(results, null, 2));
});

test("audit similar arabic+english pairs across pages", async ({ page }) => {
  const targets = [
    "/en/quran",
    "/en/duas",
    "/en/hadith",
    "/en/dhikr",
    "/en/adhan",
  ];
  await page.setViewportSize({ width: 375, height: 667 });
  for (const url of targets) {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
    if (!resp || !resp.ok()) {
      // biome-ignore lint/suspicious/noConsole: diag
      console.log("SKIP:", url, resp?.status());
      continue;
    }
    await page.waitForTimeout(400);
    const overlaps = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("[class*='row'], [class*='card']")).slice(
        0,
        6,
      ) as HTMLElement[];
      const result: any[] = [];
      for (const card of cards) {
        // find arabic (has lang=ar or Amiri font)
        const arabs = Array.from(card.querySelectorAll("*")).filter((el) => {
          const e = el as HTMLElement;
          if (e.lang === "ar") return true;
          const f = getComputedStyle(e).fontFamily.toLowerCase();
          return f.includes("amiri") || f.includes("scheherazade") || f.includes("noto") && f.includes("arabic");
        }) as HTMLElement[];
        const ar = arabs[0];
        if (!ar) continue;
        // find sibling with translation text (English)
        const rect1 = ar.getBoundingClientRect();
        result.push({
          cardClass: card.className.slice(0, 60),
          arRect: rect1.toJSON(),
          arText: (ar.textContent || "").slice(0, 20),
          arDir: getComputedStyle(ar).direction,
          arFont: getComputedStyle(ar).fontSize,
        });
        if (result.length >= 3) break;
      }
      return { url: location.pathname, result };
    });
    // biome-ignore lint/suspicious/noConsole: diag
    console.log("AUDIT:", url, JSON.stringify(overlaps, null, 2));
  }
});
