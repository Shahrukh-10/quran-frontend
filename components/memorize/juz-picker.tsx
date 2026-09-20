"use client";
// Juz picker — shows all 30 juz with per-juz add/count stats.
// Clicking one opens /memorize/juz/[n] where the user adds specific ayat.

import { Link } from "@/i18n/routing";
import { getAllMemoCards } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const EV_STORAGE = "iw:storage";

// Static juz metadata — first ayah of each juz. Constant across all Qurans.
// Data compiled from data/quran/index/by-juz.json but pre-baked here to
// avoid a client bundle import of the full 6k-entry ayat index.
const JUZ_STARTS: Array<{ n: number; start: string; startName: string }> = [
  { n: 1, start: "1:1", startName: "Al-Fatihah 1" },
  { n: 2, start: "2:142", startName: "Al-Baqarah 142" },
  { n: 3, start: "2:253", startName: "Al-Baqarah 253" },
  { n: 4, start: "3:93", startName: "Al 'Imran 93" },
  { n: 5, start: "4:24", startName: "An-Nisa' 24" },
  { n: 6, start: "4:148", startName: "An-Nisa' 148" },
  { n: 7, start: "5:82", startName: "Al-Ma'idah 82" },
  { n: 8, start: "6:111", startName: "Al-An'am 111" },
  { n: 9, start: "7:88", startName: "Al-A'raf 88" },
  { n: 10, start: "8:41", startName: "Al-Anfal 41" },
  { n: 11, start: "9:93", startName: "At-Tawbah 93" },
  { n: 12, start: "11:6", startName: "Hud 6" },
  { n: 13, start: "12:53", startName: "Yusuf 53" },
  { n: 14, start: "15:1", startName: "Al-Hijr 1" },
  { n: 15, start: "17:1", startName: "Al-Isra 1" },
  { n: 16, start: "18:75", startName: "Al-Kahf 75" },
  { n: 17, start: "21:1", startName: "Al-Anbiya 1" },
  { n: 18, start: "23:1", startName: "Al-Mu'minun 1" },
  { n: 19, start: "25:21", startName: "Al-Furqan 21" },
  { n: 20, start: "27:56", startName: "An-Naml 56" },
  { n: 21, start: "29:46", startName: "Al-'Ankabut 46" },
  { n: 22, start: "33:31", startName: "Al-Ahzab 31" },
  { n: 23, start: "36:28", startName: "Ya-Sin 28" },
  { n: 24, start: "39:32", startName: "Az-Zumar 32" },
  { n: 25, start: "41:47", startName: "Fussilat 47" },
  { n: 26, start: "46:1", startName: "Al-Ahqaf 1" },
  { n: 27, start: "51:31", startName: "Adh-Dhariyat 31" },
  { n: 28, start: "58:1", startName: "Al-Mujadilah 1" },
  { n: 29, start: "67:1", startName: "Al-Mulk 1" },
  { n: 30, start: "78:1", startName: "An-Naba 1" },
];

/** Approximate juz for a verseKey by finding the largest JUZ_STARTS entry ≤ key. */
function juzOfKey(verseKey: string): number {
  const [s, a] = verseKey.split(":").map(Number);
  const key = (s ?? 0) * 1000 + (a ?? 0);
  let last = 1;
  for (const j of JUZ_STARTS) {
    const [js, ja] = j.start.split(":").map(Number);
    const jk = (js ?? 0) * 1000 + (ja ?? 0);
    if (key >= jk) last = j.n;
    else break;
  }
  return last;
}

export function JuzPicker() {
  const t = useTranslations("memorize.juzPicker");
  const [countByJuz, setCountByJuz] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = () => {
      const counts: Record<number, number> = {};
      for (const c of getAllMemoCards()) {
        const j = juzOfKey(c.verseKey);
        counts[j] = (counts[j] ?? 0) + 1;
      }
      setCountByJuz(counts);
    };
    load();
    window.addEventListener(EV_STORAGE, load);
    return () => window.removeEventListener(EV_STORAGE, load);
  }, []);

  return (
    <section aria-labelledby="juz-picker-heading" className="mt-10">
      <h2 id="juz-picker-heading" className="text-xl font-semibold tracking-title">
        {t("heading")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-prose">{t("caption")}</p>

      <ol className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {JUZ_STARTS.map((j) => {
          const count = countByJuz[j.n] ?? 0;
          return (
            <li key={j.n}>
              <Link
                href={`/memorize/juz/${j.n}` as "/memorize/juz/[n]"}
                className="focus-ring block rounded-2xl border border-separator bg-surface p-4 hover:bg-muted transition-colors duration-micro ease-spring"
              >
                <p className="text-xs text-muted-foreground">{t("juzLabel")}</p>
                <p className="mt-1 text-lg font-bold tracking-title">{j.n}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">{j.startName}</p>
                {count > 0 && (
                  <p className="mt-2 inline-block rounded-full bg-accent-muted text-accent text-xs px-2 py-0.5">
                    {t("addedCount", { count })}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
