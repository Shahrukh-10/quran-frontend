import {
  getAllSurahs,
  getSurahByNumber,
  getSurahBySlug,
  globalAyahNumber,
  loadAyah,
  loadSurahAyat,
  totalAyahCount,
} from "@/lib/quran";
import { describe, expect, it } from "vitest";

describe("quran metadata", () => {
  it("has all 114 surahs", () => {
    expect(getAllSurahs().length).toBe(114);
  });
  it("6236 total ayat", () => {
    expect(totalAyahCount()).toBe(6236);
  });
  it("lookup by number", () => {
    expect(getSurahByNumber(1)?.slug).toBe("al-fatihah");
    expect(getSurahByNumber(114)?.slug).toBe("an-nas");
  });
  it("lookup by slug", () => {
    expect(getSurahBySlug("al-baqarah")?.number).toBe(2);
  });
  it("globalAyahNumber is 1-indexed continuous", () => {
    expect(globalAyahNumber(1, 1)).toBe(1);
    expect(globalAyahNumber(1, 7)).toBe(7);
    expect(globalAyahNumber(2, 1)).toBe(8);
    expect(globalAyahNumber(114, 6)).toBe(6236);
  });
  it("loads Imlaei + ٱ-free Uthmani mushaf text for rendering", async () => {
    // Both fields come out of loadAyah with plain alef (ا, U+0627).
    // The `arabic` field is native Imlaei from data/quran/surahs/*.json.
    // The `uthmani` field is originally Madinah-Mushaf Uthmani from
    // quran-data/verses/*.json but is normalised at load time (lib/quran.ts
    // loadSurahAyat) so U+0671 ARABIC LETTER ALEF WASLA (ٱ) is replaced
    // by U+0627 ARABIC LETTER ALEF (ا). Reason: the site serves South-Asian
    // / Turkish / North-African readers whose local mushafs use plain alef,
    // and ٱ reads as "wrong" to them. See quran-frontend-dev skill.
    //
    // We assert properties about the loaded text (ٱ absence, basmala
    // prefix) rather than exact string equality — fatha/shadda ordering
    // between source JSON files isn't stable enough for a byte-perfect
    // match, and that stability is NOT what we care about.
    const a = await loadAyah(1, 1);
    expect(a).toBeDefined();
    expect(a?.arabic).toBeTruthy();
    expect(a?.uthmani).toBeTruthy();
    // Al-Fatihah 1:1 opens with "بِسْمِ" (In the name of).
    expect(a?.arabic?.startsWith("بِسْمِ")).toBe(true);
    expect(a?.uthmani?.startsWith("بِسْمِ")).toBe(true);
    // The core regression guard — the whole point of this fix.
    expect(a?.arabic).not.toContain("\u0671");
    expect(a?.uthmani).not.toContain("\u0671");
  });
  it("has Imlaei-normalised text for every loaded ayah — no ٱ anywhere", async () => {
    let total = 0;
    let waslaLeaks = 0;
    for (const surah of getAllSurahs()) {
      const ayat = await loadSurahAyat(surah.number);
      expect(ayat?.length).toBe(surah.ayahCount);
      for (const ayah of ayat ?? []) {
        expect(ayah.uthmani, `${surah.number}:${ayah.ayah}`).toBeTruthy();
        // Hard guard: ANY surviving ٱ in a loaded ayah is a regression that
        // would leak Uthmani into client-component props + JSON-LD + SSR
        // output. The data loader must strip them before downstream consumption.
        if (ayah.uthmani?.includes("\u0671") || ayah.arabic?.includes("\u0671")) {
          waslaLeaks++;
        }
        total++;
      }
    }
    expect(total).toBe(6236);
    expect(waslaLeaks).toBe(0);
  }, 60_000);
});
