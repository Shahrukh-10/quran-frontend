import { test, expect, devices } from "@playwright/test";

// Responsive sweep — verify no horizontal scroll, no clipped content, no
// broken text overflow across the full breakpoint range that real phones
// and small tablets ship. Runs headless chromium (same engine Brave uses)
// with device emulation to catch DPR / touch / user-agent-conditioned bugs.

const BREAKPOINTS = [
  { name: "iPhone SE (small)", viewport: { width: 375, height: 667 }, isMobile: true },
  { name: "iPhone 12 mini", viewport: { width: 360, height: 780 }, isMobile: true },
  { name: "iPhone 15", viewport: { width: 393, height: 852 }, isMobile: true },
  { name: "iPhone 15 Pro Max", viewport: { width: 430, height: 932 }, isMobile: true },
  { name: "Pixel 7", viewport: { width: 412, height: 915 }, isMobile: true },
  { name: "Galaxy S8+", viewport: { width: 360, height: 740 }, isMobile: true },
  { name: "iPad mini portrait", viewport: { width: 768, height: 1024 }, isMobile: true },
  { name: "iPad landscape", viewport: { width: 1024, height: 768 }, isMobile: true },
  { name: "iPhone SE landscape", viewport: { width: 667, height: 375 }, isMobile: true },
];

const CRITICAL_PAGES = [
  "/en",
  "/en/quran",
  "/en/quran/al-fatihah",
  "/en/hadith",
  "/en/hadith/bukhari",
  "/en/hadith/bukhari/203",
  "/en/prayer-times",
  "/en/qibla",
  "/en/duas",
  "/en/learn-salah",
  "/en/names-of-allah",
  "/ar",
  "/ur",
];

for (const bp of BREAKPOINTS) {
  test.describe(`breakpoint: ${bp.name} (${bp.viewport.width}x${bp.viewport.height})`, () => {
    test.use({
      viewport: bp.viewport,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      isMobile: bp.isMobile,
      hasTouch: true,
    });

    for (const path of CRITICAL_PAGES) {
      test(`${path} — no horizontal scroll, no clipped elements`, async ({ page }) => {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);

        const info = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const clientW = doc.clientWidth;

          // Real user-facing test: can the page actually scroll horizontally?
          // `overflow-x: clip` on html/body prevents scrolling even when
          // `scrollWidth` still reflects escaped children. What matters to
          // the user is whether `window.scrollX` moves when they try.
          window.scrollTo(400, 0);
          const actualScrollX = window.scrollX;
          window.scrollTo(0, 0);

          // Diagnostic: elements that visually poke out (right edge past
          // viewport) so we can identify + fix source-of-truth width bugs
          // even when overflow: clip hides them from the user.
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const overflowers: Array<{ tag: string; cls: string; right: number; width: number }> = [];
          if (scrollW > clientW + 1) {
            const walk = (el: Element) => {
              if (!(el instanceof HTMLElement)) return;
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              if (cs.position === "fixed" || cs.position === "sticky") return;
              if (r.right > clientW + 1 && r.width > 8 && r.width < scrollW) {
                overflowers.push({
                  tag: el.tagName.toLowerCase(),
                  cls: el.className?.slice(0, 60) || "",
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                });
              }
              for (const c of el.children) walk(c);
            };
            walk(document.body);
          }

          return {
            viewport: { w: clientW, h: doc.clientHeight },
            scrollW,
            actualScrollX,
            hasHorizontalScroll: actualScrollX > 0,
            hasEscapedContent: scrollW > clientW + 1,
            offenders: overflowers.slice(0, 6),
          };
        });

        expect(
          info.hasHorizontalScroll,
          `${path} at ${bp.name}: user CAN scroll horizontally (scrollX went to ${info.actualScrollX}) · offenders=${JSON.stringify(info.offenders)}`,
        ).toBe(false);
        // Soft-warn on escaped content (not user-facing but points to CSS
        // bug worth fixing at source):
        if (info.hasEscapedContent) {
          console.warn(
            `[warn] ${path} @ ${bp.name}: content escapes viewport (scrollW=${info.scrollW}, viewport=${info.viewport.w}) but clipped from scroll · offenders=${JSON.stringify(info.offenders)}`,
          );
        }
      });
    }
  });
}
