import { ArticleSchema, QuranChapterSchema } from "@/components/seo/structured-data";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);

function renderArticle(dates: { datePublished?: string; dateModified?: string } = {}) {
  return renderToStaticMarkup(
    React.createElement(ArticleSchema, {
      headline: "Sources",
      description: "Content sources",
      url: "https://qurandaily.com/sources",
      ...dates,
    }),
  );
}

describe("ArticleSchema dates", () => {
  it("omits unknown dates from the rendered JSON-LD", () => {
    const html = renderArticle();
    expect(html).not.toContain('"datePublished"');
    expect(html).not.toContain('"dateModified"');
  });

  it("preserves a supplied publication date without inventing a modification date", () => {
    const html = renderArticle({ datePublished: "2025-03-02" });
    expect(html).toContain('"datePublished":"2025-03-02"');
    expect(html).not.toContain('"dateModified"');
  });

  it("preserves both explicitly supplied dates", () => {
    const html = renderArticle({ datePublished: "2025-03-02", dateModified: "2025-04-03" });
    expect(html).toContain('"datePublished":"2025-03-02"');
    expect(html).toContain('"dateModified":"2025-04-03"');
  });
});

describe("rendered JSON-LD", () => {
  it("escapes script-closing input while preserving the original JSON value", () => {
    const headline = "</script><script>alert('unsafe')</script>";
    const html = renderToStaticMarkup(
      React.createElement(ArticleSchema, {
        headline,
        description: "Content sources",
        url: "https://qurandaily.com/sources",
      }),
    );
    const openingTag = '<script type="application/ld+json">';
    expect(html.startsWith(openingTag)).toBe(true);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    const serialized = html.slice(openingTag.length, -"</script>".length);
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toMatchObject({ headline });
  });

  it("describes the verse count without claiming physical page numbers", () => {
    const html = renderToStaticMarkup(
      React.createElement(QuranChapterSchema, {
        surahName: "Al-Fatihah",
        surahNumber: 1,
        ayahCount: 7,
        revelation: "meccan",
        url: "https://qurandaily.com/quran/al-fatihah",
      }),
    );
    expect(html).toContain("with 7 verses.");
    expect(html).not.toContain('"pageStart"');
    expect(html).not.toContain('"pageEnd"');
  });
});
