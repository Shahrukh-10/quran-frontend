"use client";
// Morning & evening adhkar with tap-to-count. Content is well-established Hisnul Muslim
// selections. Every entry names its source.

import { bumpDhikr, getStore } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Adhkar = {
  key: string;
  arabic: string;
  transliteration: string;
  translation: { en: string; id: string };
  count: number;
  source: string;
};

const ADHKAR_SET: ReadonlyArray<Adhkar> = [
  {
    key: "ayat-al-kursi",
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ …",
    transliteration: "Ayat al-Kursi (2:255)",
    translation: {
      en: "Recite Ayat al-Kursi in the morning and evening — protection from jinn until the same time the next day.",
      id: "Baca Ayat Kursi di pagi dan petang — perlindungan dari jin sampai waktu yang sama esok hari.",
    },
    count: 1,
    source: "Sunan an-Nasa'i 9928",
  },
  {
    key: "surah-al-ikhlas-and-mu-awwidhatan",
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ … قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ … قُلْ أَعُوذُ بِرَبِّ النَّاسِ …",
    transliteration: "Al-Ikhlas + Al-Falaq + An-Nas",
    translation: {
      en: "Reciting these three suffices you against every harm — morning and evening.",
      id: "Membaca ketiganya cukup melindungimu dari segala keburukan — pagi dan petang.",
    },
    count: 3,
    source: "Sunan Abu Dawud 5082",
  },
  {
    key: "bismillah-la-yadur",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    transliteration:
      "Bismillāhil-ladhī lā yaḍurru maʿasmihi shay'un fil-arḍi wa lā fis-samāʾi wa huwas-samīʿul-ʿalīm",
    translation: {
      en: "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm — He is the All-Hearing, the All-Knowing.",
      id: "Dengan nama Allah, yang dengan nama-Nya tidak ada yang membahayakan, di bumi maupun di langit — Dia Maha Mendengar, Maha Mengetahui.",
    },
    count: 3,
    source: "Sunan Abu Dawud 5088",
  },
  {
    key: "radeetu-billahi-rabban",
    arabic: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
    transliteration: "Raḍītu billāhi rabban, wa bil-islāmi dīnan, wa bi-Muḥammadin ﷺ nabiyyā",
    translation: {
      en: "I am pleased with Allah as Lord, Islam as religion, and Muhammad ﷺ as Prophet.",
      id: "Aku rida Allah sebagai Tuhan, Islam sebagai agama, dan Muhammad ﷺ sebagai Nabi.",
    },
    count: 3,
    source: "Sunan Abu Dawud 5072",
  },
  {
    key: "subhanallahi-wa-bihamdih",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    transliteration: "Subḥān Allāhi wa bi-ḥamdih",
    translation: {
      en: "Glory be to Allah, and all praise is for Him.",
      id: "Mahasuci Allah dan segala puji bagi-Nya.",
    },
    count: 100,
    source: "Sahih Muslim 2692",
  },
  {
    key: "la-ilaha-illallah-wahdah",
    arabic: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration:
      "Lā ilāha illallāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shay'in qadīr",
    translation: {
      en: "None has the right to be worshipped except Allah alone; He has no partner. His is the dominion and His is the praise, and He is capable over all things.",
      id: "Tiada Tuhan selain Allah semata, tiada sekutu bagi-Nya. Milik-Nya kerajaan dan pujian, dan Dia berkuasa atas segala sesuatu.",
    },
    count: 10,
    source: "Sahih al-Bukhari 6403",
  },
  {
    key: "istighfar-100",
    arabic: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
    transliteration: "Astaghfirullāha wa atūbu ilayh",
    translation: {
      en: "I seek forgiveness from Allah and turn to Him in repentance.",
      id: "Aku memohon ampunan kepada Allah dan bertobat kepada-Nya.",
    },
    count: 100,
    source: "Sahih al-Bukhari 6307",
  },
];

export function AdhkarList({ locale }: { locale: "en" | "id" }) {
  const t = useTranslations("tools.adhkar");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const s = getStore().dhikrCounts;
    setCounts(
      ADHKAR_SET.reduce<Record<string, number>>((acc, a) => {
        acc[a.key] = s[a.key] ?? 0;
        return acc;
      }, {}),
    );
    const listen = () => {
      const s = getStore().dhikrCounts;
      setCounts(
        ADHKAR_SET.reduce<Record<string, number>>((acc, a) => {
          acc[a.key] = s[a.key] ?? 0;
          return acc;
        }, {}),
      );
    };
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, []);

  return (
    <ul className="space-y-3">
      {ADHKAR_SET.map((a) => {
        const c = counts[a.key] ?? 0;
        const done = c >= a.count;
        return (
          <li
            key={a.key}
            className={`rounded-2xl border p-5 transition-colors duration-micro ease-spring ${
              done ? "border-accent bg-accent-muted" : "border-separator bg-surface"
            }`}
          >
            <p lang="ar" dir="rtl" className="font-quran text-4xl leading-[2.2] text-right">
              {a.arabic}
            </p>
            <p className="mt-3 italic text-sm text-muted-foreground">{a.transliteration}</p>
            <p className="mt-2 text-sm leading-relaxed">{a.translation[locale]}</p>
            <p className="mt-2 text-xs text-muted-foreground">Source: {a.source}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm tabular-nums">
                {c} / {a.count}
              </p>
              <button
                type="button"
                onClick={() => {
                  const n = bumpDhikr(a.key);
                  setCounts((prev) => ({ ...prev, [a.key]: n }));
                  if (navigator.vibrate) navigator.vibrate(10);
                }}
                aria-label={`${t("title")} — tap`}
                className="focus-ring inline-flex items-center rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-4 h-11 text-sm font-medium hover:opacity-90 transition-opacity duration-micro ease-spring"
              >
                +1
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
