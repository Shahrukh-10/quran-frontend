import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Every content page we care about — EN + ID locale, verse pages, tools,
// dua pages, prayer times. If axe finds a WCAG 2.1 AA violation on ANY of
// these, CI fails. This catches accessibility regressions the moment they
// land, before they reach production.
//
// We deliberately keep this list PROD-representative rather than exhaustive:
// duplicate axe runs across 100 city pages tell us nothing new when they
// share a template. Sample the templates, not every instance.
const PAGES: Array<{ path: string; name: string }> = [
  { path: "/", name: "home (en)" },
  { path: "/id", name: "home (id)" },
  { path: "/quran", name: "quran index" },
  { path: "/quran/al-fatihah", name: "surah reader (short)" },
  { path: "/quran/al-baqarah/255", name: "single ayah (Ayat al-Kursi)" },
  { path: "/quran/word-by-word/al-fatihah", name: "word-by-word" },
  { path: "/study/1-1?tab=tafsir", name: "study mode — tafsir tab" },
  { path: "/duas", name: "duas index" },
  { path: "/id/duas", name: "duas index (id)" },
  { path: "/duas/daily-routines", name: "dua category" },
  { path: "/prayer-times", name: "prayer times index" },
  { path: "/prayer-times/london", name: "prayer times city" },
  { path: "/qibla", name: "qibla" },
  { path: "/names-of-allah", name: "99 names index" },
  { path: "/names-of-allah/ar-rahman", name: "single name" },
  { path: "/learn", name: "learn" },
  { path: "/learn-salah", name: "learn salah index" },
  { path: "/tools/tasbih", name: "tasbih counter" },
  { path: "/tools/zakat", name: "zakat calculator" },
  { path: "/settings", name: "settings" },
  { path: "/id/settings", name: "settings (id)" },
  { path: "/mushaf", name: "mushaf" },
  { path: "/does-not-exist", name: "404" },
];

for (const { path, name } of PAGES) {
  test(`a11y: ${name} (${path})`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const results = await new AxeBuilder({ page })
      // Restrict to real user-blocking violations. Tag list follows the
      // default set that Lighthouse uses so both tools stay in sync.
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Skip: color-contrast-enhanced is AAA (nice-to-have); scrollable-region
      // fires on scroll containers that have proper aria; region can fire on
      // ephemeral test injections. Add rules to this list only with a comment
      // explaining WHY — never to hide a real bug.
      .disableRules(["color-contrast-enhanced"])
      .analyze();

    // Print violations before assertion so CI logs show what broke.
    if (results.violations.length > 0) {
      console.log(
        `\n[${name}] axe found ${results.violations.length} violation(s):\n${results.violations
          .map(
            (v) =>
              `  - ${v.id} (${v.impact}): ${v.help}\n    ${v.helpUrl}\n    affected: ${v.nodes.length} node(s), sample: ${v.nodes[0]?.target?.join(" ")}`,
          )
          .join("\n")}`,
      );
    }

    expect(results.violations, `axe violations on ${path}`).toEqual([]);
  });
}
