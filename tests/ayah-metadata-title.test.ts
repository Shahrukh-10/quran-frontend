import { buildAyahTitle } from "@/lib/seo";
import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";
import urMessages from "@/messages/ur.json";
import { type AbstractIntlMessages, NextIntlClientProvider, createTranslator } from "next-intl";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
vi.mock("@/components/quran/surah-header-bar", () => ({ SurahHeaderBar: () => null }));
vi.mock("@/components/quran/surah-reader-controls", () => ({ SurahReaderControls: () => null }));
vi.mock("@/i18n/routing", () => ({
  routing: { defaultLocale: "en" },
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: () => {},
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const messages: AbstractIntlMessages =
      locale === "ur" ? urMessages : locale === "id" ? idMessages : enMessages;
    return createTranslator({ locale, messages, namespace });
  },
}));

import AyahPage, { generateMetadata } from "@/app/[locale]/quran/[surah]/[ayah]/page";
import { generateMetadata as generateSurahMetadata } from "@/app/[locale]/quran/[surah]/page";
import { loadAyah } from "@/lib/quran";
import { hreflangLanguages, robotsForLocale } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

describe("ayah metadata title", () => {
  it("strips bracketed translator insertions without splitting words", () => {
    const title = buildAyahTitle(
      5,
      6,
      "Al-Ma'idah",
      "O you who have believed, when you rise to [perform] prayer, wash your faces.",
    );
    expect(title).not.toMatch(/[\[\]]/);
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title).toBe('Quran 5:6 — Al-Ma\'idah · "O you who have believed, when you rise to…"');
  });

  it("leaves short translations intact and normalizes whitespace", () => {
    expect(buildAyahTitle(94, 6, "Ash-Sharh", "For indeed, with hardship [will be] ease.")).toBe(
      'Quran 94:6 — Ash-Sharh · "For indeed, with hardship ease."',
    );
  });

  it("preserves apostrophes and casing", () => {
    expect(
      buildAyahTitle(99, 7, "Az-Zalzalah", "So whoever does an atom's weight of good will see it,"),
    ).toContain("atom's");
  });

  it("removes adjacent and nested bracket insertions while preserving unmatched brackets", () => {
    expect(buildAyahTitle(1, 1, "Al-Fatihah", "First[aside][nested[aside]last")).toBe(
      'Quran 1:1 — Al-Fatihah · "First last"',
    );
    expect(buildAyahTitle(1, 1, "Al-Fatihah", "First [unfinished")).toBe(
      'Quran 1:1 — Al-Fatihah · "First [unfinished"',
    );
  });

  it("trims trailing preview punctuation without splitting words", () => {
    expect(buildAyahTitle(1, 1, "Al-Fatihah", `First ,;:—–- ${"word ".repeat(30)}`)).toBe(
      'Quran 1:1 — Al-Fatihah · "First ,;:—–- word word word word word word…"',
    );
    expect(buildAyahTitle(1, 1, "Al-Fatihah", `First ,;:—–- ${"longword".repeat(10)}`)).toBe(
      'Quran 1:1 — Al-Fatihah · "First…"',
    );
  });

  it("keeps long surah names and uses only whole preview words", () => {
    const title = buildAyahTitle(
      3,
      100,
      "Aal-i-Imraan",
      "supercalifragilisticexpialidocioussupercalifragilisticexpialidocious",
    );
    expect(title).toBe("Quran 3:100 — Aal-i-Imraan");
  });

  it("uses the identity when no translation is available", () => {
    expect(buildAyahTitle(1, 1, "Al-Fatihah", "")).toBe("Quran 1:1 — Al-Fatihah");
    expect(buildAyahTitle(1, 1, "A".repeat(60), "A translation")).not.toContain('"');
  });

  it("uses the sourced Indonesian translation", async () => {
    const ayah = await loadAyah(1, 2);
    expect(buildAyahTitle(1, 2, "Al-Fatihah", ayah?.translations["id.indonesian"] ?? "")).toBe(
      'Quran 1:2 — Al-Fatihah · "Segala puji bagi Allah, Tuhan semesta alam."',
    );
  });
});

describe("hreflang canonical paths", () => {
  it("matches indexable locale root canonicals without an Indonesian trailing slash", () => {
    expect(hreflangLanguages("/")).toEqual({
      en: siteUrl("/"),
      id: siteUrl("/id"),
      "x-default": siteUrl("/"),
    });
  });

  it("preserves content paths and excludes noindex locales", () => {
    expect(hreflangLanguages("quran/al-fatihah")).toEqual({
      en: siteUrl("/quran/al-fatihah"),
      id: siteUrl("/id/quran/al-fatihah"),
      "x-default": siteUrl("/quran/al-fatihah"),
    });
  });
});

describe("ayah locale metadata and server content", () => {
  it("keeps Urdu UI RTL while the real AyahCard English translation stays LTR", async () => {
    const ayah = await loadAyah(1, 2);
    const html = renderToStaticMarkup(
      jsx(NextIntlClientProvider, {
        locale: "ur",
        messages: { quran: urMessages.quran },
        timeZone: "UTC",
        children: await AyahPage({
          params: Promise.resolve({ locale: "ur", surah: "al-fatihah", ayah: "2" }),
        }),
      }),
    );
    expect(html).toMatch(/^<article lang="ur" dir="rtl"/);
    expect(html).toContain("پچھلی آیت");
    expect(html).toContain("تفسیر پڑھیں");
    expect(html).toContain('id="ayah-2"');
    expect(html).toMatch(/<p lang="en" dir="ltr"[^>]*>\[All\] praise/);
    expect(html).toContain(ayah?.translations["en.sahih"]);
    expect(html).toContain('<p lang="ar" dir="rtl"');
    expect(html).toContain('<h1 lang="en" dir="ltr"');
  });

  it("localizes Indonesian surah metadata without translating the English name meaning", async () => {
    const metadata = await generateSurahMetadata({
      params: Promise.resolve({ locale: "id", surah: "al-fatihah" }),
    });
    expect(metadata.description).toContain("terjemahan bahasa Indonesia");
    expect(metadata.description).not.toContain("The Opening");
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.alternates?.canonical).toBe(siteUrl("/id/quran/al-fatihah"));
  });
  it.each(["en", "id", "ur"])(
    "uses sourced content for %s without inventing translations",
    async (locale) => {
      const ayah = await loadAyah(1, 1);
      const translation = ayah?.translations[locale === "id" ? "id.indonesian" : "en.sahih"];
      expect(translation).toBeTruthy();
      const params = Promise.resolve({ locale, surah: "al-fatihah", ayah: "1" });
      const metadata = await generateMetadata({ params });
      expect(metadata.title).toEqual({
        absolute: buildAyahTitle(1, 1, "Al-Fatihah", translation ?? ""),
      });
      expect(metadata.openGraph?.description).toBe(translation);
      expect(metadata.alternates?.canonical).toBe(
        siteUrl(`${locale === "en" ? "" : `/${locale}`}/quran/al-fatihah/1`),
      );
      const html = renderToStaticMarkup(
        jsx(NextIntlClientProvider, {
          locale,
          messages: {
            quran: (locale === "ur" ? urMessages : locale === "id" ? idMessages : enMessages).quran,
          },
          timeZone: "UTC",
          children: await AyahPage({ params }),
        }),
      );
      expect(html).toContain(`lang="${locale === "id" ? "id" : "en"}" dir="ltr"`);
      expect(html).toContain('lang="id" dir="ltr"');
      expect(html).toContain('lang="en" dir="ltr"');
      expect(html).toContain("Kementerian Agama RI");
      expect(html).not.toContain("Terjemahan Indonesia");
      if (locale === "id") {
        expect(metadata.description).toContain("terjemahan bahasa Indonesia");
        expect(html).toContain("Ayat 1 dari 7");
        expect(html).not.toContain("This is the");
        const schemas = [
          ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
        ].flatMap((match) => {
          const data = JSON.parse(match[1] ?? "{}");
          return data["@graph"] ?? [data];
        });
        for (const type of ["Article", "Quotation"]) {
          const schema = schemas.find((data) => data["@type"] === type);
          expect(schema.inLanguage).toBe("id");
          expect(schema.url).toBe(siteUrl("/id/quran/al-fatihah/1"));
          expect(schema[type === "Article" ? "description" : "text"]).toBe(translation);
          if (type === "Quotation") {
            expect(schema.citation).toContain("Kementerian Agama RI (id.indonesian)");
          }
        }
      }
      if (locale === "ur") expect(robotsForLocale(locale)).toMatchObject({ index: false });
    },
  );
});
