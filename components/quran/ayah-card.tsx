"use client";
// AyahCard — Arabic + translation + transliteration + audio + bookmark.
// Client component: needs localStorage (bookmark, settings) and <audio> control.
// Reads settings from lib/storage.ts and rerenders on the `iw:storage` custom event.

import { Link } from "@/i18n/routing";
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

  const handlePlay = useCallback(async () => {
    // If a surah-level sequence is running through some ayah, hand off to
    // the header-bar controller so we don't double-play. It will decide
    // whether we're toggling off (same ayah) or jumping to this one.
    if (surahAudioActive) {
      window.dispatchEvent(
        new CustomEvent(EV_PLAY_AYAH, { detail: { surah: ayah.surah, ayah: ayah.ayah } }),
      );
      return;
    }
    // Also emit if the user starts playback from a specific ayah while no
    // sequence is active — this lets the SurahHeaderBar catch it and
    // continue reading from here through the end of the surah.
    window.dispatchEvent(
      new CustomEvent(EV_PLAY_AYAH, { detail: { surah: ayah.surah, ayah: ayah.ayah } }),
    );
    // The header-bar controller (if mounted) will now handle audio. If it's
    // not on this page (e.g. standalone ayah view), fall back to local
    // single-ayah playback exactly as before.
    if (!standalone) {
      // Wait a frame so the header bar can claim the request.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (surahAudioActive) return; // header bar took over
    }
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
  }, [src, ayah.surah, ayah.ayah, surahAudioActive, standalone]);

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

  const arabicSize =
    settings.fontSize === "sm"
      ? "text-2xl"
      : settings.fontSize === "md"
        ? "text-3xl"
        : settings.fontSize === "lg"
          ? "text-4xl"
          : "text-5xl";
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
          {ayah.arabic}
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
          href={`/quran/word-by-word/${surahSlug}#ayah-${ayah.ayah}` as "/quran/word-by-word/[surah]"}
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
