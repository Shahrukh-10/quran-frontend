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
  it("loads Uthmani mushaf text for reader rendering", async () => {
    await expect(loadAyah(1, 1)).resolves.toMatchObject({
      arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      uthmani: "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ",
    });
  });
  it("has Uthmani text for every loaded ayah", async () => {
    let total = 0;
    for (const surah of getAllSurahs()) {
      const ayat = await loadSurahAyat(surah.number);
      expect(ayat?.length).toBe(surah.ayahCount);
      for (const ayah of ayat ?? []) {
        expect(ayah.uthmani, `${surah.number}:${ayah.ayah}`).toBeTruthy();
        total++;
      }
    }
    expect(total).toBe(6236);
  }, 60_000);
});
