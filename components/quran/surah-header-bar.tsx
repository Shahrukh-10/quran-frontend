"use client";
// SurahHeaderBar — promoted top-of-page controls for the ayah reader:
//   • Language-mode segmented control (Arabic + translation / Arabic only /
//     English only)
//   • Translation picker (also mirrored in the collapsed "Reading settings")
//   • Reciter picker
//   • Play-surah button (sequences audio ayah-by-ayah, auto-scrolls the
//     currently playing ayah into view)
//   • Keyboard shortcuts: Space play/pause, J/K next/prev ayah, T cycles
//     languageMode
// 'use client' because we need localStorage, <audio>, and event handling.

import { RECITERS, type ReciterId, TRANSLATIONS, type TranslationId, audioUrl } from "@/lib/quran";
import { getStore, setLastRead, updateSettings } from "@/lib/storage";
import { BookOpenIcon, LanguagesIcon, PauseIcon, PlayIcon, Volume2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  surah: number;
  surahSlug: string;
  ayahCount: number;
};

type PlayingEventDetail = { surah: number; ayah: number } | null;
type PlayAyahRequest = { surah: number; ayah: number };

// Window-level event names — AyahCard listens to these to render its
// "currently playing" ring and to accept jump-in-place clicks.
const EV_PLAYING_CHANGE = "iw:playing-change";
const EV_PLAY_AYAH = "iw:play-ayah";

export function SurahHeaderBar({ surah, surahSlug: _surahSlug, ayahCount }: Props) {
  const [settings, setSettings] = useState(() => getStore().settings);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRequestedRef = useRef(false);

  // Sync from the shared settings store so this component reacts to changes
  // from the collapsed "Reading settings" panel too. Same iw:storage
  // convention as ayah-card / surah-reader-controls.
  useEffect(() => {
    setSettings(getStore().settings);
    const onChange = () => setSettings(getStore().settings);
    window.addEventListener("iw:storage", onChange);
    return () => window.removeEventListener("iw:storage", onChange);
  }, []);

  const languageMode = settings.languageMode ?? "arabic-and-translation";

  // Broadcast the currently-playing ayah so AyahCards can highlight themselves
  // and so a click on a specific ayah can request "start playing from here".
  const broadcastPlaying = useCallback((detail: PlayingEventDetail) => {
    window.dispatchEvent(new CustomEvent<PlayingEventDetail>(EV_PLAYING_CHANGE, { detail }));
  }, []);

  const scrollAyahIntoView = useCallback((ayah: number) => {
    const el = document.getElementById(`ayah-${ayah}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // Play a specific ayah; wires up the "ended" handler that advances to the
  // next ayah in the surah. Because we reuse a single <audio> element, we
  // reset its src cleanly between ayat to avoid stale-buffer glitches.
  const playFrom = useCallback(
    (startAyah: number) => {
      stopRequestedRef.current = false;

      const step = (ayah: number) => {
        if (stopRequestedRef.current) return;
        if (ayah < 1 || ayah > ayahCount) {
          setPlaying(false);
          broadcastPlaying(null);
          return;
        }
        setCurrent(ayah);
        broadcastPlaying({ surah, ayah });
        setLastRead(surah, ayah);
        scrollAyahIntoView(ayah);

        const url = audioUrl(settings.reciter as ReciterId, surah, ayah);
        let el = audioRef.current;
        if (!el) {
          el = new Audio();
          el.preload = "auto";
          audioRef.current = el;
        }
        // Detach any old listeners before rewiring so we don't stack them
        // across multiple ayat.
        el.onended = null;
        el.onerror = null;
        el.src = url;
        el.onended = () => step(ayah + 1);
        el.onerror = () => {
          setPlaying(false);
          broadcastPlaying(null);
        };
        void el.play().catch(() => {
          setPlaying(false);
          broadcastPlaying(null);
        });
      };

      setPlaying(true);
      step(startAyah);
    },
    [ayahCount, broadcastPlaying, scrollAyahIntoView, settings.reciter, surah],
  );

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
    broadcastPlaying(null);
  }, [broadcastPlaying]);

  const togglePlay = useCallback(() => {
    if (playing) {
      stop();
    } else {
      playFrom(current);
    }
  }, [current, playFrom, playing, stop]);

  // Allow AyahCard to request "play from ayah N" by clicking its play button.
  useEffect(() => {
    const onRequest = (ev: Event) => {
      const detail = (ev as CustomEvent<PlayAyahRequest>).detail;
      if (!detail || detail.surah !== surah) return;
      // If we're already playing this same ayah, treat this as a stop.
      if (playing && current === detail.ayah) {
        stop();
        return;
      }
      // Otherwise start fresh from the requested ayah.
      stopRequestedRef.current = true;
      if (audioRef.current) audioRef.current.pause();
      playFrom(detail.ayah);
    };
    window.addEventListener(EV_PLAY_AYAH, onRequest as EventListener);
    return () => window.removeEventListener(EV_PLAY_AYAH, onRequest as EventListener);
  }, [current, playFrom, playing, stop, surah]);

  // If the reciter changes mid-playback, restart the current ayah with the
  // new voice — otherwise we'd finish the old ayah in the old voice then
  // jump to the new one, which sounds wrong.
  useEffect(() => {
    if (!playing || !audioRef.current) return;
    const el = audioRef.current;
    const url = audioUrl(settings.reciter as ReciterId, surah, current);
    if (el.src === url) return;
    el.src = url;
    void el.play().catch(() => {
      setPlaying(false);
      broadcastPlaying(null);
    });
  }, [broadcastPlaying, current, playing, settings.reciter, surah]);

  // Clean up on unmount so we don't leave audio playing when navigating away.
  useEffect(() => {
    return () => {
      stopRequestedRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Keyboard shortcuts — Space (play/pause), J/K (next/prev ayah), T (cycle
  // language mode). We ignore keys typed inside form fields so the settings
  // pickers keep working normally.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (ev.key === " ") {
        ev.preventDefault();
        togglePlay();
      } else if (ev.key.toLowerCase() === "j") {
        // Next ayah
        if (current < ayahCount) {
          if (playing) playFrom(current + 1);
          else {
            setCurrent(current + 1);
            scrollAyahIntoView(current + 1);
          }
        }
      } else if (ev.key.toLowerCase() === "k") {
        // Previous ayah
        if (current > 1) {
          if (playing) playFrom(current - 1);
          else {
            setCurrent(current - 1);
            scrollAyahIntoView(current - 1);
          }
        }
      } else if (ev.key.toLowerCase() === "t") {
        const order = ["arabic-and-translation", "arabic-only", "translation-only"] as const;
        const idx = order.indexOf(languageMode);
        const next = order[(idx + 1) % order.length];
        updateSettings({ languageMode: next });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ayahCount, current, languageMode, playFrom, playing, scrollAyahIntoView, togglePlay]);

  const setLanguageMode = (mode: typeof languageMode) => {
    updateSettings({ languageMode: mode });
  };

  return (
    <div className="mt-8">
      <div
        role="toolbar"
        aria-label="Surah reader controls"
        aria-live="polite"
        className="flex flex-col gap-3 rounded-2xl border border-separator bg-surface/60 p-3 sm:p-4 sm:flex-row sm:flex-wrap sm:items-center"
      >
        {/* Play surah — primary action, kept prominent */}
        <button
          type="button"
          onClick={togglePlay}
          aria-pressed={playing}
          aria-label={playing ? "Pause surah recitation" : "Play surah recitation"}
          className={`focus-ring inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
            playing
              ? "bg-accent text-[hsl(var(--accent-foreground))] hover:opacity-90"
              : "border border-separator bg-background hover:bg-muted"
          }`}
        >
          {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          {playing ? `Playing ayah ${current}` : "Play surah"}
        </button>

        {/* Language-mode segmented control */}
        <fieldset className="flex items-center rounded-lg border border-separator bg-background p-0.5">
          <legend className="sr-only">Language mode</legend>
          {(
            [
              { id: "arabic-and-translation", label: "Arabic + English", short: "Both", shortLang: undefined },
              { id: "arabic-only", label: "Arabic only", short: "العربية", shortLang: "ar" },
              { id: "translation-only", label: "English only", short: "English", shortLang: undefined },
            ] as const
          ).map((opt) => {
            const active = languageMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLanguageMode(opt.id)}
                aria-pressed={active}
                aria-label={opt.label}
                title={opt.label}
                className={`focus-ring inline-flex h-10 min-w-[68px] items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent text-[hsl(var(--accent-foreground))]"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="hidden sm:inline">{opt.label}</span>
                {opt.shortLang ? (
                  <span className="sm:hidden" lang={opt.shortLang} dir="rtl">
                    {opt.short}
                  </span>
                ) : (
                  <span className="sm:hidden">{opt.short}</span>
                )}
              </button>
            );
          })}
        </fieldset>

        {/* Translation picker (promoted from the reading-settings panel) */}
        <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-separator bg-background px-3 text-sm">
          <LanguagesIcon size={14} className="text-muted-foreground" aria-hidden />
          <span className="sr-only">Translation</span>
          <select
            aria-label="Translation"
            value={settings.translation}
            onChange={(e) => updateSettings({ translation: e.target.value as TranslationId })}
            className="focus-ring bg-transparent text-sm outline-none"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        {/* Reciter picker */}
        <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-separator bg-background px-3 text-sm">
          <Volume2Icon size={14} className="text-muted-foreground" aria-hidden />
          <span className="sr-only">Reciter</span>
          <select
            aria-label="Reciter"
            value={settings.reciter}
            onChange={(e) => updateSettings({ reciter: e.target.value as ReciterId })}
            className="focus-ring bg-transparent text-sm outline-none"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.short}
              </option>
            ))}
          </select>
        </label>

        <span className="hidden text-xs text-muted-foreground sm:ml-auto sm:inline-flex sm:items-center sm:gap-1">
          <BookOpenIcon size={12} aria-hidden /> Space · J/K · T
        </span>
      </div>
    </div>
  );
}
