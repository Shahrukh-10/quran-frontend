"use client";
// Word-by-word Ayah renderer — Quran.com's signature feature.
// Each Arabic word is clickable/tappable. Tap = show translation +
// transliteration + play word audio.
//
// Data source: quran-data/verses/{surah}.json (per-verse array
// with a `words` field per verse). Fetched at build time via
// `pnpm sync:quran-com --only=verses`, or lazy-loaded from the API on demand.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  className?: string;
};

export function WordByWordAyah({ verseKey, words, script = "uthmani", className = "" }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const close = useCallback(() => setActiveIdx(null), []);

  // Dismiss the tooltip on outside click / ESC.
  useEffect(() => {
    if (activeIdx === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".wbw-word") && !t.closest(".wbw-tooltip")) close();
    };
    // Defer the listener attachment so the click that OPENED us doesn't
    // immediately close us. window/document click fires after React
    // handlers, so we need a microtask delay.
    const timer = setTimeout(() => {
      document.addEventListener("keydown", onKey);
      document.addEventListener("click", onClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [activeIdx, close]);

  const playWord = useCallback((audioUrl: string | null) => {
    if (!audioUrl) return;
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

  // Filter out verse-end markers if you don't want the ۝ shown as a word.
  // We keep them because Q.com's markers are numbered and look intentional.
  const displayWords = useMemo(() => words, [words]);

  return (
    <div className={`wbw-ayah ${className}`} dir="rtl" lang="ar">
      {displayWords.map((w, idx) => {
        const isActive = activeIdx === idx;
        const text = script === "indopak" ? (w.text_indopak ?? w.text_uthmani) : w.text_uthmani;
        const isEnd = w.char_type_name === "end";
        return (
          <span key={w.id} className="wbw-word-wrap">
            <button
              type="button"
              className={`wbw-word${isActive ? " wbw-word--active" : ""}${isEnd ? " wbw-word--end" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx(isActive ? null : idx);
                if (!isActive) playWord(w.audio_url);
              }}
              aria-expanded={isActive}
              aria-label={
                isEnd
                  ? `Verse ${verseKey} end marker`
                  : `Word: ${w.translation?.text ?? w.transliteration?.text ?? text}`
              }
            >
              {text}
            </button>
            {isActive && !isEnd && (
              <span className="wbw-tooltip" role="tooltip">
                <span className="wbw-tooltip__ar" lang="ar" dir="rtl">
                  {text}
                </span>
                {w.transliteration?.text && (
                  <span className="wbw-tooltip__translit">{w.transliteration.text}</span>
                )}
                {w.translation?.text && (
                  <span className="wbw-tooltip__trans">{w.translation.text}</span>
                )}
                <span className="wbw-tooltip__actions">
                  <button
                    type="button"
                    className="wbw-tooltip__btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playWord(w.audio_url);
                    }}
                    aria-label="Play word pronunciation"
                  >
                    ▶ Play
                  </button>
                  <span className="wbw-tooltip__loc">{w.location}</span>
                </span>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
