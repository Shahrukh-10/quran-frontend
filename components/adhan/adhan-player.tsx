"use client";
// A simple adhan player. Uses public CDNs known to host adhan audio (Islamic Network).
// User taps to play — no autoplay ever (docs/DESIGN.md).

import { PauseIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

const MUEZZINS = [
  {
    id: "makkah",
    name: "Makkah — Ali Mullah",
    url: "https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais/1.mp3",
  },
  {
    id: "madinah",
    name: "Madinah — Essam Bukhari",
    url: "https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3",
  },
  {
    id: "alafasy",
    name: "Alafasy",
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
