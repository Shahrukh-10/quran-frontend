"use client";
// Tasbih counter — click/tap area is the whole card so it's usable single-handed.
// Presets follow the classic adhkar counts. Custom count is manual.

import { bumpDhikr, getStore, resetDhikr } from "@/lib/storage";
import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const PRESETS = [
  { key: "subhanallah", arabic: "سُبْحَانَ اللَّهِ", tr: "Subḥān Allāh", target: 33 },
  { key: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", tr: "Al-ḥamdu lillāh", target: 33 },
  { key: "allahu-akbar", arabic: "اللَّهُ أَكْبَرُ", tr: "Allāhu akbar", target: 34 },
  { key: "la-ilaha-illallah", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", tr: "Lā ilāha illallāh", target: 100 },
  { key: "astaghfirullah", arabic: "أَسْتَغْفِرُ اللَّهَ", tr: "Astaghfirullāh", target: 100 },
  { key: "salawat", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", tr: "Allāhumma ṣalli ʿalā Muḥammad", target: 100 },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

const DEFAULT_PRESET = PRESETS[0]; // tuple literal — narrowed, not undefined

export function TasbihCounter() {
  const t = useTranslations("tools.tasbih");
  const [active, setActive] = useState<PresetKey>(DEFAULT_PRESET.key);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const c = getStore().dhikrCounts[active] ?? 0;
    setCount(c);
    const listen = () => setCount(getStore().dhikrCounts[active] ?? 0);
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, [active]);

  const preset = PRESETS.find((p) => p.key === active) ?? DEFAULT_PRESET;

  const tap = useCallback(() => {
    const n = bumpDhikr(active, 1);
    setCount(n);
    if (navigator.vibrate) navigator.vibrate(10);
  }, [active]);

  const reset = useCallback(() => {
    resetDhikr(active);
    setCount(0);
  }, [active]);

  const percent = Math.min(100, (count / preset.target) * 100);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setActive(p.key)}
            aria-pressed={active === p.key}
            className={`focus-ring rounded-lg border h-16 px-3 text-left text-sm transition-colors duration-micro ease-spring ${
              active === p.key
                ? "border-accent bg-accent-muted text-accent"
                : "border-separator bg-surface hover:bg-muted"
            }`}
          >
            <p className="font-quran text-lg leading-none" lang="ar" dir="rtl">
              {p.arabic}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {p.tr} · {t("target")} {p.target}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={tap}
        aria-label={`Tap to count. Current count: ${count}.`}
        className="focus-ring mt-6 w-full rounded-3xl border border-separator bg-surface p-8 text-center hover:bg-muted transition-colors duration-micro ease-spring active:scale-[0.99]"
      >
        <p className="font-quran text-4xl leading-none" lang="ar" dir="rtl">
          {preset.arabic}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{preset.tr}</p>
        <p className="mt-6 text-7xl font-bold tabular-nums">{count}</p>
        <div className="mt-6 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-micro ease-spring"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {count} / {preset.target}
        </p>
      </button>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-separator bg-surface px-3 h-10 text-sm text-muted-foreground hover:bg-muted transition-colors duration-micro ease-spring"
        >
          <RotateCcwIcon size={14} />
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
