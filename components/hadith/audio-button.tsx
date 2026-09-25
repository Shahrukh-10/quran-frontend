"use client";
// Web Speech API play button. We ship no audio files — instead we synthesize
// the Arabic text on the client using the browser's built-in TTS. This gives
// every hadith audio playback (34,259 of them) at zero storage/bandwidth cost,
// and works offline once the browser has an Arabic voice installed.
//
// Trade-off: it's TTS, not a Qari recitation. Honest labeling matters, so the
// button says "Listen" — never "Recitation" — and the aria-label makes clear
// it's synthesized. If the browser has no Arabic voice, we fall back to the
// default voice; if speechSynthesis is missing entirely, the button hides.

import { useCallback, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { stopAllAudio, useAudioLock } from "@/lib/audio-lock";

type Props = {
  arabic: string;
  label?: string;
  labelPlaying?: string;
  /** Visual size — inline row-level (sm) vs prominent detail page (md). */
  size?: "sm" | "md";
};

function pickArabicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer explicit ar-SA (Modern Standard Arabic, Saudi). Fall back to any Arabic voice.
  return (
    voices.find((v) => v.lang === "ar-SA") ??
    voices.find((v) => v.lang.startsWith("ar-")) ??
    voices.find((v) => v.lang.startsWith("ar")) ??
    null
  );
}

export function HadithAudioButton({
  arabic,
  label = "Listen",
  labelPlaying = "Stop",
  size = "sm",
}: Props) {
  // Optimistic default: render the button on first paint (SSR + pre-hydration),
  // and only hide it once we've confirmed the browser has no speechSynthesis.
  // This avoids a hydration-time layout shift where the button pops in.
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    // Voices load asynchronously in some browsers; trigger a fetch so
    // pickArabicVoice() has a populated list by the time the user clicks.
    const s = window.speechSynthesis;
    const priming = () => s.getVoices();
    priming();
    s.addEventListener?.("voiceschanged", priming);

    return () => {
      s.removeEventListener?.("voiceschanged", priming);
      // Cancel any in-flight utterance owned by this button.
      if (utteranceRef.current) {
        s.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const stop = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setPlaying(false);
    utteranceRef.current = null;
  };

  // Register with the global audio lock — if any Quran audio (surah header,
  // ayah card, word-by-word) or the adhan player starts, cancel our TTS.
  useAudioLock(useCallback(stop, []));

  const play = () => {
    // Universal precondition: stop everything else in the app first.
    stopAllAudio();

    const s = window.speechSynthesis;
    // Kill any existing utterance across the app so buttons don't stack.
    s.cancel();

    // GA4 event — track hadith audio playback for engagement analytics
    trackEvent("read_hadith", { source: "audio_button", arabic_length: arabic.length });

    const u = new SpeechSynthesisUtterance(arabic);
    u.lang = "ar-SA";
    const voice = pickArabicVoice();
    if (voice) u.voice = voice;
    u.rate = 0.85; // Classical Arabic reads better slightly slower than default.
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

  const base =
    "focus-ring inline-flex items-center gap-1.5 rounded-full border border-separator bg-surface text-muted-foreground hover:text-foreground hover:border-accent transition-colors";
  const sizing = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <button
      type="button"
      onClick={playing ? stop : play}
      aria-label={
        playing
          ? "Stop synthesized audio"
          : "Listen — text-to-speech playback of the Arabic text"
      }
      aria-pressed={playing}
      className={`${base} ${sizing}`}
    >
      <span aria-hidden="true">{playing ? "■" : "▶"}</span>
      <span>{playing ? labelPlaying : label}</span>
    </button>
  );
}
