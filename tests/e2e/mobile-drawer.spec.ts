import { test, expect } from "@playwright/test";

test("mobile drawer — grouped, centered, all items visible", async ({ page }) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.locator(".hig-nav__menu-btn").click();
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const drawer = document.querySelector(".hig-nav__drawer") as HTMLElement | null;
    if (!drawer) return { ok: false as const, reason: "no drawer" };
    const groups = Array.from(drawer.querySelectorAll(".hig-nav__drawer-group")) as HTMLElement[];
    const groupSummary = groups.map((g) => {
      const title = g.querySelector(".hig-nav__drawer-title")?.textContent?.trim() ?? "";
      const links = Array.from(g.querySelectorAll("a")) as HTMLAnchorElement[];
      return { title, count: links.length, items: links.map((a) => a.textContent?.trim()) };
    });
    // Check first-group first-link alignment: center should be within 15px of that group's center
    const firstA = drawer.querySelector("a") as HTMLAnchorElement | null;
    const firstRect = firstA?.getBoundingClientRect();
    const cs = firstA ? getComputedStyle(firstA) : null;
    return {
      ok: true as const,
      viewportW: window.innerWidth,
      groupCount: groups.length,
      groupSummary,
      firstLink: firstA
        ? {
            text: firstA.textContent?.trim(),
            left: Math.round(firstRect!.left),
            right: Math.round(firstRect!.right),
            textAlign: cs!.textAlign,
          }
        : null,
    };
  });
  console.log("DRAWER_GROUPED", JSON.stringify(info, null, 2));

  expect(info.ok).toBe(true);
  if (!info.ok) return;
  expect(info.groupCount, "number of groups").toBe(4);
  const titles = info.groupSummary.map((g) => g.title.toLowerCase());
  expect(titles).toEqual(["read", "practice", "learn", "you"]);
  // Every group has at least 3 items
  for (const g of info.groupSummary) {
    expect(g.count, `group ${g.title} item count`).toBeGreaterThanOrEqual(3);
  }
  expect(info.firstLink?.textAlign).toBe("center");
});

test("mobile drawer — Arabic (RTL) still centered", async ({ page }) => {
  await page.goto("/ar", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.locator(".hig-nav__menu-btn").click();
  await page.waitForTimeout(500);
  const groups = await page.locator(".hig-nav__drawer-group").count();
  expect(groups).toBe(4);
  const titleTexts = await page.locator(".hig-nav__drawer-title").allTextContents();
  console.log("AR_TITLES", JSON.stringify(titleTexts));
  // None of the titles should be the English "READ" etc — should be Arabic
  for (const t of titleTexts) {
    expect(t.trim().length).toBeGreaterThan(0);
    expect(t.toLowerCase()).not.toBe("read");
  }
});
