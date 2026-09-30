"use client";
// Dual-language audio button pair for hadith: Arabic (ar-SA) and English (en-US).
// Both use the browser's Web Speech API (SpeechSynthesis). We ship no audio
// files — the honest label is "Listen", never "Recitation". Only ONE utterance
// speaks at a time across the whole page (via the shared audio-lock).
//
// Voice-selection is deterministic per language:
//   Arabic  → prefer ar-SA voice, fallback to any ar-*, then any Arabic voice
//   English → prefer a natural-sounding en-* voice (Google/Microsoft first),
//             fallback to any en-* voice, then the platform default
//
// This is the fix for "randomly reading" — before, the browser could pick a
// non-English voice for the translation button and mangle pronunciation.

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { stopAllAudio, useAudioLock } from "@/lib/audio-lock";

type Lang = "ar" | "en";

type Props = {
  text: string;
  lang: Lang;
  label?: string;
  labelPlaying?: string;
  size?: "sm" | "md";
};

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (lang === "ar") {
    return (
      voices.find((v) => v.lang === "ar-SA") ??
      voices.find((v) => v.lang.startsWith("ar-")) ??
      voices.find((v) => v.lang.startsWith("ar")) ??
      null
    );
  }

  // English: prefer natural-sounding voices, deterministic order.
  const enVoices = voices.filter((v) => v.lang.startsWith("en"));
  if (!enVoices.length) return null;
  // Rank order: name contains "Google" or "Microsoft" (higher quality on Chrome/Edge),
  // then en-US, then en-GB, then any en-*.
  const scored = enVoices.map((v) => {
    let score = 0;
    if (/google|microsoft|natural|neural/i.test(v.name)) score += 10;
    if (v.lang === "en-US") score += 5;
    else if (v.lang === "en-GB") score += 3;
    else if (v.lang.startsWith("en-")) score += 1;
    if (v.default) score += 1;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? enVoices[0] ?? null;
}

export function HadithAudioButton({
  text,
  lang,
  label,
  labelPlaying = "Stop",
  size = "sm",
}: Props) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const s = window.speechSynthesis;
    const priming = () => s.getVoices();
    priming();
    s.addEventListener?.("voiceschanged", priming);
    return () => {
      s.removeEventListener?.("voiceschanged", priming);
      if (utteranceRef.current) s.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    utteranceRef.current = null;
  }, []);

  useAudioLock(stop);

  if (!supported) return null;

  const play = () => {
    stopAllAudio();
    const s = window.speechSynthesis;
    s.cancel();
    trackEvent("read_hadith", {
      source: `audio_button_${lang}`,
      length: text.length,
    });
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ar" ? "ar-SA" : "en-US";
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = lang === "ar" ? 0.85 : 1.0;
    u.pitch = 1;
    u.onend = () => {
      setPlaying(false);
      utteranceRef.current = null;
    };
    u.onerror = () => {
      setPlaying(false);
      utteranceRef.current = null;
    };
    utteranceRef.current = u;
    setPlaying(true);
    s.speak(u);
  };

  const defaultLabel = lang === "ar" ? "Listen · Arabic" : "Listen · English";
  const shown = label ?? defaultLabel;
  const base =
    "focus-ring inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface text-muted-foreground hover:text-foreground hover:border-accent hover:bg-accent/5 transition-colors";
  const sizing = size === "md" ? "px-3.5 py-2 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <button
      type="button"
      onClick={playing ? stop : play}
      aria-label={
        playing
          ? `Stop ${lang === "ar" ? "Arabic" : "English"} audio`
          : `Listen — text-to-speech playback of the ${lang === "ar" ? "Arabic" : "English"} text`
      }
      aria-pressed={playing}
      className={`${base} ${sizing}`}
      title={
        playing
          ? "Stop"
          : `Play ${lang === "ar" ? "Arabic" : "English"} (text-to-speech)`
      }
    >
      <span aria-hidden="true" className="text-[0.85em] leading-none">
        {playing ? "■" : "▶"}
      </span>
      <span className="font-medium">{playing ? labelPlaying : shown}</span>
    </button>
  );
}
