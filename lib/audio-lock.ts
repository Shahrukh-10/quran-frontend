// Global audio-lock — one-voice-at-a-time enforcement.
//
// Any audio component in the app (ayah card, surah header bar, word-by-word,
// hadith TTS, adhan player) MUST wire itself into this lock to prevent
// two voices playing simultaneously.
//
// Contract for every audio component:
//
//   1. On mount, useAudioLock(stopFn) where stopFn pauses THIS component's
//      audio and resets its `playing` UI state.
//   2. Immediately BEFORE starting playback (or before `el.play()`), call
//      stopAllAudio(). This tells every OTHER audio component in the app to
//      pause. The component that just called stopAllAudio then starts its
//      own playback normally.
//
// Why an event-based lock rather than a React context / singleton audio
// element: audio components in this app are scattered across the tree and
// are conditionally mounted (surah header only on /quran/[surah], hadith
// button only on /hadith/[book]/[number], word-by-word only on
// /quran/word-by-word/[surah], etc.). A React context would require every
// page to wrap children in a provider. A window event is stateless, works
// across every route, and requires zero coordination between components
// beyond honoring the contract.

import { useEffect } from "react";

const EV_STOP_ALL = "iw:stop-all-audio";

/**
 * Broadcast a "stop everything" signal. Every audio component in the app
 * listens for this and pauses itself. Call this from the click handler
 * BEFORE you start your own playback.
 *
 * Safe to call from any component, at any time, on any page. No-op if
 * nothing is currently playing.
 */
export function stopAllAudio() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EV_STOP_ALL));
}

/**
 * Register this audio component's stop function with the global lock.
 * When any OTHER component calls stopAllAudio(), your stopFn will run.
 *
 * Your stopFn should:
 *   - pause() / cancel() the underlying audio (HTMLAudioElement or
 *     SpeechSynthesis)
 *   - reset the component's `playing` React state to false
 *
 * The hook automatically ignores its own component's stopAllAudio() calls
 * only if you don't want to self-fire (you'd have started your own audio
 * milliseconds later anyway, so self-firing is harmless — but the caller
 * pattern in this codebase is: stopAllAudio() first, then play — so the
 * self-fire pauses nothing since we haven't started yet).
 */
export function useAudioLock(stopFn: () => void) {
  useEffect(() => {
    const handler = () => {
      try {
        stopFn();
      } catch {
        /* swallow — a failing stop shouldn't break the app */
      }
    };
    window.addEventListener(EV_STOP_ALL, handler);
    return () => window.removeEventListener(EV_STOP_ALL, handler);
  }, [stopFn]);
}
