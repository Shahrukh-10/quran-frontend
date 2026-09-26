"use client";
// AyahCard — Arabic + translation + transliteration + audio + bookmark.
// Client component: needs localStorage (bookmark, settings) and <audio> control.
// Reads settings from lib/storage.ts and rerenders on the `iw:storage` custom event.

import { Link } from "@/i18n/routing";
import { cleanArabicForDisplay } from "@/lib/arabic-text";
import { stopAllAudio, useAudioLock } from "@/lib/audio-lock";
import type { Ayah } from "@/lib/quran";
import { type ReciterId, TRANSLATIONS, type TranslationId, audioUrl } from "@/lib/quran";
import { getStore, isAyahBookmarked, setLastRead, toggleAyahBookmark } from "@/lib/storage";
import { BookmarkIcon, PauseIcon, PlayIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

// Event names shared with SurahHeaderBar. Ayah cards listen for
// EV_PLAYING_CHANGE to render their "currently playing" ring, and emit
// EV_PLAY_AYAH when the user hits the per-ayah play button so the
// header-bar controller can take over sequencing.
const EV_PLAYING_CHANGE = "iw:playing-change";
const EV_PLAY_AYAH = "iw:play-ayah";

type PlayingDetail = { surah: number; ayah: number } | null;

type Props = {
  ayah: Ayah;
  surahSlug: string;
  surahName: string;
  standalone?: boolean; // full-page ayah view
};

export function AyahCard({ ayah, surahSlug, surahName, standalone = false }: Props) {
  const t = useTranslations("quran.ayahActions");
  const [bookmarked, setBookmarked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [surahAudioActive, setSurahAudioActive] = useState(false);
  const [settings, setSettings] = useState(() => getStore().settings);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setBookmarked(isAyahBookmarked(ayah.surah, ayah.ayah));
    setSettings(getStore().settings);
    const onChange = () => {
      setBookmarked(isAyahBookmarked(ayah.surah, ayah.ayah));
      setSettings(getStore().settings);
    };
    window.addEventListener("iw:storage", onChange);
    return () => window.removeEventListener("iw:storage", onChange);
  }, [ayah.surah, ayah.ayah]);

  // Listen for surah-level playback events so this ayah can render a
  // "currently playing" ring when the SurahHeaderBar is sequencing audio
  // through it. When surah audio moves away from this ayah we also stop
  // any per-ayah playback the card owned locally.
  useEffect(() => {
    const onPlayingChange = (ev: Event) => {
      const detail = (ev as CustomEvent<PlayingDetail>).detail;
      const isMe = !!detail && detail.surah === ayah.surah && detail.ayah === ayah.ayah;
      setSurahAudioActive(isMe);
      if (!isMe && audioRef.current && !audioRef.current.paused) {
        // Header bar started sequencing (or stopped) — release our own
        // per-ayah audio so we don't play in parallel with the surah audio.
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    window.addEventListener(EV_PLAYING_CHANGE, onPlayingChange as EventListener);
    return () => window.removeEventListener(EV_PLAYING_CHANGE, onPlayingChange as EventListener);
  }, [ayah.surah, ayah.ayah]);

  const reciter = settings.reciter as ReciterId;
  const translationId = settings.translation as TranslationId;
  const translation =
    ayah.translations[translationId] ??
    ayah.translations["en.sahih"] ??
    Object.values(ayah.translations)[0] ??
    "";

  const src = ayah.audio[reciter] ?? audioUrl(reciter, ayah.surah, ayah.ayah);

  // Register with the global audio lock — if any other audio component in
  // the app starts playing, THIS ayah's audio must stop. This prevents the
  // "two voices at once" bug where a per-ayah tap raced with the surah
  // header bar's sequencing.
  useAudioLock(
    useCallback(() => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      setPlaying(false);
    }, []),
  );

  const handlePlay = useCallback(async () => {
    // Universal precondition: whatever ELSE is playing, stop it. This
    // enforces one-voice-at-a-time across every audio component in the app
    // (surah header bar, word-by-word, hadith TTS, adhan player, other ayah
    // cards). See lib/audio-lock.ts.
    stopAllAudio();

    // If a surah-level sequence is running through some ayah, hand off to
    // the header-bar controller so it can either toggle-off (same ayah) or
    // jump to this one. The dispatched event goes to the header bar; we do
    // NOT fall through to local playback afterwards.
    if (surahAudioActive) {
      window.dispatchEvent(
        new CustomEvent(EV_PLAY_AYAH, { detail: { surah: ayah.surah, ayah: ayah.ayah } }),
      );
      return;
    }

    // On a surah page the SurahHeaderBar is mounted and should be the
    // canonical player (it handles sequencing + auto-scroll). Ask it to
    // start from this ayah. If nobody catches the event within one frame
    // (e.g. we're on the standalone /quran/[surah]/[ayah] page where the
    // header bar isn't mounted), fall back to local single-ayah playback.
    let handled = false;
    const claim = () => {
      handled = true;
    };
    // The header bar (when mounted) fires EV_PLAYING_CHANGE from inside its
    // own play handler; we use that as the "handoff acknowledged" signal.
    window.addEventListener(EV_PLAYING_CHANGE, claim as EventListener, { once: true });
    window.dispatchEvent(
      new CustomEvent(EV_PLAY_AYAH, { detail: { surah: ayah.surah, ayah: ayah.ayah } }),
    );
    // Wait two rAFs so any listener has time to synchronously kick off its
    // own <audio>.play() and fire the broadcast. Two rAFs ≈ 32 ms, imperceptible.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    window.removeEventListener(EV_PLAYING_CHANGE, claim as EventListener);
    if (handled) return;

    // Nobody claimed → play locally.
    let el = audioRef.current;
    if (!el) {
      el = new Audio(src);
      el.preload = "none";
      audioRef.current = el;
      el.addEventListener("ended", () => setPlaying(false));
      el.addEventListener("pause", () => setPlaying(false));
    } else if (el.src !== src) {
      el.pause();
      el.src = src;
    }
    if (el.paused) {
      try {
        await el.play();
        setPlaying(true);
        setLastRead(ayah.surah, ayah.ayah);
      } catch {
        setPlaying(false);
      }
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [src, ayah.surah, ayah.ayah, surahAudioActive]);

  const handleBookmark = useCallback(() => {
    const on = toggleAyahBookmark(ayah.surah, ayah.ayah);
    setBookmarked(on);
  }, [ayah.surah, ayah.ayah]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/quran/${surahSlug}/${ayah.ayah}`;
    const text = `${surahName} ${ayah.surah}:${ayah.ayah} — ${translation}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${surahName} ${ayah.surah}:${ayah.ayah}`, text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      } catch {
        /* clipboard denied */
      }
    }
  }, [surahSlug, surahName, ayah, translation]);

  // Mushaf-scale sizes — matches quran.com/recitequran.com scale.
  // sm=36px, md=48px (default), lg=60px, xl=72px. Bumped up from the previous
  // 24/30/36/48px because KFGQPC glyphs need real estate for the harakat to
  // breathe (user feedback: "font size should be more large").
  const arabicSize =
    settings.fontSize === "sm"
      ? "text-4xl" // 36px
      : settings.fontSize === "md"
        ? "text-5xl" // 48px
        : settings.fontSize === "lg"
          ? "text-6xl" // 60px
          : "text-7xl"; // 72px
  const bodyFont = settings.dyslexiaMode ? "font-mono" : "";

  const languageMode = settings.languageMode ?? "arabic-and-translation";
  const showArabic = languageMode !== "translation-only";
  const showTranslation = languageMode !== "arabic-only";
  // Transliteration is a bridge between the Arabic and its English meaning,
  // so it only makes sense in the "both" mode. The task spec explicitly
  // said 'arabic-only' hides transliteration too, and translation-only has
  // no Arabic to transliterate.
  const showTransliteration =
    settings.showTransliteration && languageMode === "arabic-and-translation";
  // Translation-only mode gets a slightly larger body font for comfortable
  // long-form reading; other modes keep the default relaxed size.
  const translationSize = languageMode === "translation-only" ? "text-lg sm:text-xl" : "text-base";

  return (
    <article
      className={`rounded-2xl border bg-surface p-5 sm:p-6 transition-shadow duration-micro ease-spring ${
        surahAudioActive
          ? "border-accent ring-2 ring-accent/60 shadow-[0_0_0_4px_hsl(var(--accent)/0.08)]"
          : "border-separator"
      } ${standalone ? "shadow-none" : ""}`}
      id={`ayah-${ayah.ayah}`}
      aria-current={surahAudioActive ? "true" : undefined}
    >
      <header className="flex items-center justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex items-center gap-2 rounded-lg bg-accent-muted px-2 py-1 text-xs font-medium text-accent"
        >
          {ayah.surah}:{ayah.ayah}
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            label={playing || surahAudioActive ? "Pause recitation" : "Play recitation"}
            onClick={handlePlay}
            active={playing || surahAudioActive}
          >
            {playing || surahAudioActive ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </IconButton>
          <IconButton
            label={bookmarked ? "Remove bookmark" : "Bookmark this ayah"}
            onClick={handleBookmark}
            active={bookmarked}
          >
            <BookmarkIcon size={18} fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Share this ayah" onClick={handleShare}>
            <ShareIcon size={18} />
          </IconButton>
        </div>
      </header>

      {showArabic && (
        <p lang="ar" dir="rtl" className={`mt-5 font-quran leading-[2.4] text-right ${arabicSize}`}>
          {cleanArabicForDisplay(ayah.arabic)}
        </p>
      )}

      {showArabic && showTransliteration && ayah.transliteration && (
        <p className={`mt-4 italic text-muted-foreground leading-relaxed ${bodyFont}`}>
          {ayah.transliteration}
        </p>
      )}

      {showTranslation && (
        <p className={`mt-4 leading-relaxed ${translationSize} ${bodyFont}`}>{translation}</p>
      )}

      <footer className="mt-4 pt-3 border-t border-separator text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          Juz {ayah.juz} · Page {ayah.page}
        </span>
        <span>{TRANSLATIONS.find((t) => t.id === translationId)?.name ?? "Translation"}</span>
        <Link
          href={`/study/${ayah.surah}-${ayah.ayah}?tab=tafsir` as "/study/[verseKey]"}
          className="ml-auto text-accent hover:underline focus-ring"
        >
          {t("readTafsir")}
        </Link>
        <Link
          href={
            `/quran/word-by-word/${surahSlug}#ayah-${ayah.ayah}` as "/quran/word-by-word/[surah]"
          }
          className="text-accent hover:underline focus-ring"
        >
          {t("wordByWord")}
        </Link>
      </footer>
    </article>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-micro ease-spring ${
        active
          ? "text-accent bg-accent-muted"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
