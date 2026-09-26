"use client";
// Word-by-word Ayah renderer — Quran.com's / recitequran.com's signature UX.
// Each Arabic word is a clickable/tappable token; by default the English gloss
// and transliteration are shown ALWAYS visible under each word (interlinear
// layout, matches recitequran.com/1:1). Tap = play word audio.
//
// Data source: quran-data/verses/{surah}.json (per-verse array with a `words`
// field). Fetched at build time via `pnpm sync:quran-com --only=verses` or
// lazy-loaded from the Quran.com API on demand.

import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { stopAllAudio, useAudioLock } from "@/lib/audio-lock";
import { useCallback, useMemo, useRef } from "react";

type Word = {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: "word" | "end";
  text_uthmani: string;
  text_indopak?: string;
  location: string; // "1:1:1"
  translation?: { text: string; language_name: string };
  transliteration?: { text: string; language_name: string };
};

type Props = {
  verseKey: string; // e.g. "1:1"
  words: Word[];
  script?: "uthmani" | "indopak";
  /** When true, show English + transliteration under each word by default.
   *  Set to false to fall back to the compact tap-to-reveal tooltip layout. */
  showGlosses?: boolean;
  className?: string;
};

export function WordByWordAyah({
  verseKey,
  words,
  script = "uthmani",
  showGlosses = true,
  className = "",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playWord = useCallback((audioUrl: string | null) => {
    if (!audioUrl) return;
    // Stop anything else in the app before starting our word audio.
    stopAllAudio();
    const full = audioUrl.startsWith("http")
      ? audioUrl
      : `https://audio.qurancdn.com/${audioUrl.replace(/^\/+/, "")}`;
    if (!audioRef.current) {
      audioRef.current = new Audio(full);
    } else {
      audioRef.current.pause();
      audioRef.current.src = full;
    }
    audioRef.current.play().catch(() => {
      /* autoplay blocked, ignore */
    });
  }, []);

  // Global stop signal — when the surah header bar or an ayah card starts
  // playing, cut our word audio so we don't overlap.
  useAudioLock(
    useCallback(() => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }, []),
  );

  const displayWords = useMemo(() => words, [words]);

  return (
    <div
      className={`wbw-ayah ${showGlosses ? "wbw-ayah--interlinear" : ""} ${className}`}
      dir="rtl"
      lang="ar"
    >
      {displayWords.map((w) => {
        const text = script === "indopak" ? (w.text_indopak ?? w.text_uthmani) : w.text_uthmani;
        const isEnd = w.char_type_name === "end";
        return (
          <button
            key={w.id}
            type="button"
            className={`wbw-token${isEnd ? " wbw-token--end" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEnd) playWord(w.audio_url);
            }}
            aria-label={
              isEnd
                ? `Verse ${verseKey} end marker`
                : `Word: ${w.translation?.text ?? w.transliteration?.text ?? text}`
            }
          >
            <span className="wbw-token__ar" lang="ar" dir="rtl">
              {cleanArabicForDisplay(text)}
            </span>
            {showGlosses && !isEnd && (
              <>
                {w.transliteration?.text && (
                  <span className="wbw-token__translit" dir="ltr">
                    {w.transliteration.text}
                  </span>
                )}
                {w.translation?.text && (
                  <span className="wbw-token__trans" dir="ltr">
                    {w.translation.text}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
