"use client";
// A simple adhan player. NOTE: current audio URLs are Quran recitation
// samples (Surah 1 & 2), NOT actual adhan (call to prayer) recordings.
// Free public adhan MP3 CDNs are unreliable; before shipping to production,
// commit curated adhan MP3s under `public/audio/adhan/*.mp3` and swap the
// URLs below to `/audio/adhan/<file>.mp3`. Labels are honest until then.

import { PauseIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { stopAllAudio, useAudioLock } from "@/lib/audio-lock";

const MUEZZINS = [
  {
    id: "alafasy-1",
    name: "Sheikh Mishary Al-Afasy — Al-Fātiḥah (sample)",
    url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3",
  },
  {
    id: "alafasy-2",
    name: "Sheikh Mishary Al-Afasy — Al-Baqarah opening (sample)",
    url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3",
  },
] as const;

type MuezzinId = (typeof MUEZZINS)[number]["id"];
const DEFAULT_MUEZZIN = MUEZZINS[0];

export function AdhanPlayer() {
  const t = useTranslations("adhan");
  const [selected, setSelected] = useState<MuezzinId>(DEFAULT_MUEZZIN.id);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = MUEZZINS.find((m) => m.id === selected) ?? DEFAULT_MUEZZIN;

  // Register with the global audio lock — if anything else in the app
  // starts playing, pause the adhan too. See lib/audio-lock.ts.
  useAudioLock(
    useCallback(() => {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      setPlaying(false);
    }, []),
  );

  const toggle = useCallback(async () => {
    let el = audioRef.current;
    if (!el) {
      el = new Audio(current.url);
      el.preload = "none";
      audioRef.current = el;
      el.addEventListener("ended", () => setPlaying(false));
      el.addEventListener("pause", () => setPlaying(false));
    } else if (el.src !== current.url) {
      el.pause();
      el.src = current.url;
    }
    if (el.paused) {
      // Stop anything else in the app before starting adhan playback.
      stopAllAudio();
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      el.pause();
      setPlaying(false);
    }
  }, [current.url]);

  return (
    <section className="rounded-2xl border border-separator bg-surface p-6">
      <label className="block text-sm">
        <span className="block mb-1 text-xs text-muted-foreground uppercase tracking-widest">
          {t("muezzin")}
        </span>
        <select
          className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value as MuezzinId)}
        >
          {MUEZZINS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("pause") : t("play")}
          className="focus-ring inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent text-[hsl(var(--accent-foreground))] hover:opacity-90 transition-opacity duration-micro ease-spring"
        >
          {playing ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
        </button>
      </div>
    </section>
  );
}
