"use client";
// Plain, uniform-gap list for the book reader. We previously virtualized with
// react-window and estimated row heights from character count — that caused
// visible gap inconsistency between cards (short Arabic hadiths got padded to
// the same estimated slot as long ones, so the whitespace after each card
// varied). At 50 hadiths per page virtualization buys nothing; regular DOM
// with `space-y-4` renders every card at natural height with identical gaps.
//
// The file name is kept so upstream imports still resolve.

import { HadithAudioButton } from "@/components/hadith/audio-button";
import type { Hadith } from "@/lib/hadith";

type Lang = "en" | "id";

export function HadithVirtualList({
  hadiths,
  lang,
  bookLabel,
}: {
  hadiths: Hadith[];
  lang: Lang;
  bookLabel: string;
}) {
  return (
    <ol className="mt-2 space-y-4 list-none p-0">
      {hadiths.map((h) => {
        const translation = h.translation[lang] || h.translation.en;
        return (
          <li key={h.number}>
            <article
              aria-label={`${bookLabel} #${h.number}`}
              className="rounded-2xl border border-separator bg-surface p-5"
            >
              <header className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium tracking-widest uppercase">
                  #{h.number}
                </span>
                <div className="flex items-center gap-2">
                  {h.grade ? (
                    <span className="text-accent">{h.grade}</span>
                  ) : null}
                  {h.arabic ? <HadithAudioButton arabic={h.arabic} /> : null}
                </div>
              </header>
              {h.arabic ? (
                <p
                  lang="ar"
                  dir="rtl"
                  className="mt-3 font-quran text-4xl leading-[2] text-right"
                >
                  {h.arabic}
                </p>
              ) : null}
              {translation ? (
                <p className="mt-3 text-base leading-relaxed">{translation}</p>
              ) : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
