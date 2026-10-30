import { getPathname } from "@/i18n/routing";
import {
  TRANSLATIONS,
  getAllSurahs,
  getSurahByNumber,
  getSurahBySlug,
  globalAyahNumber,
  loadAyah,
  loadSurahAyat,
  resolveAyahTranslation,
  totalAyahCount,
} from "@/lib/quran";
import en from "@/messages/en.json";
import id from "@/messages/id.json";
import ur from "@/messages/ur.json";
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
    const availableEditionIds = new Set<string>();
    for (const surah of getAllSurahs()) {
      const ayat = await loadSurahAyat(surah.number);
      expect(ayat?.length).toBe(surah.ayahCount);
      for (const ayah of ayat ?? []) {
        expect(ayah.uthmani, `${surah.number}:${ayah.ayah}`).toBeTruthy();
        for (const editionId of Object.keys(ayah.translations)) {
          expect(TRANSLATIONS.some((edition) => edition.id === editionId)).toBe(true);
          availableEditionIds.add(editionId);
        }
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
    expect([...availableEditionIds].sort()).toEqual(
      TRANSLATIONS.map((edition) => edition.id).sort(),
    );
  }, 60_000);
});

describe("Quran translation language", () => {
  it("uses the selected edition's text and language, not the interface language", () => {
    expect(resolveAyahTranslation({ "id.indonesian": "Indonesian text" }, "id.indonesian")).toEqual(
      {
        id: "id.indonesian",
        name: "Kementerian Agama RI",
        lang: "id",
        dir: "ltr",
        text: "Indonesian text",
      },
    );
  });

  it("defaults to English and labels an unavailable Urdu preference honestly", () => {
    const translations = { "en.sahih": "English text", "id.indonesian": "Indonesian text" };
    expect(resolveAyahTranslation(translations, "ur.nonexistent")).toMatchObject({
      id: "en.sahih",
      lang: "en",
      dir: "ltr",
      text: "English text",
    });
    expect(resolveAyahTranslation(translations, "en.sahih")?.id).toBe("en.sahih");
  });

  it("uses another registered edition when the selected and default editions are missing", () => {
    expect(
      resolveAyahTranslation({ "en.pickthall": "Pickthall text" }, "id.indonesian"),
    ).toMatchObject({ id: "en.pickthall", name: "Marmaduke Pickthall", lang: "en" });
  });

  it("skips empty text and never invents metadata for unknown editions", () => {
    expect(
      resolveAyahTranslation({ "en.sahih": " ", "id.indonesian": "Text" }, "en.sahih")?.lang,
    ).toBe("id");
    expect(resolveAyahTranslation({}, "en.sahih")).toBeUndefined();
    expect(
      resolveAyahTranslation({ "ur.nonexistent": "Unknown text" }, "ur.nonexistent"),
    ).toBeUndefined();
  });
});

describe("Quran locale routing", () => {
  it.each([
    ["en", "/quran/al-fatihah/1"],
    ["ur", "/ur/quran/al-fatihah/1"],
    ["id", "/id/quran/al-fatihah/1"],
  ] as const)("keeps %s in the share pathname", (locale, expected) => {
    expect(getPathname({ locale, href: "/quran/al-fatihah/1" })).toBe(expected);
  });
});

describe("Quran UI catalogs", () => {
  function flattenMessages(messages: object, prefix = ""): Record<string, string> {
    return Object.fromEntries(
      Object.entries(messages).flatMap(([key, value]) => {
        const path = `${prefix}${key}`;
        return typeof value === "string"
          ? [[path, value]]
          : Object.entries(flattenMessages(value, `${path}.`));
      }),
    );
  }

  it.each([
    ["ur", ur],
    ["id", id],
  ] as const)("preserves %s Quran keys and ICU placeholders", (_locale, catalog) => {
    const english = flattenMessages(en.quran);
    const localized = flattenMessages(catalog.quran);
    expect(Object.keys(localized).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      const placeholders = (message: string) =>
        [...message.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();
      expect(placeholders(localized[key] ?? ""), key).toEqual(placeholders(value));
      expect(localized[key], key).not.toContain("\uFFFD");
    }
  });

  it("has no copied English ordinary Quran UI labels in Urdu", () => {
    const english = flattenMessages(en.quran);
    for (const [key, value] of Object.entries(flattenMessages(ur.quran))) {
      expect(value, key).not.toBe(english[key]);
    }
  });
});
