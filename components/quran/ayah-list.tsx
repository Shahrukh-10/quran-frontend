// AyahList — server component. Takes an ordered list of verse_keys and renders
// each ayah using the existing AyahCard so styling/behavior stays identical to
// the surah reader. Groups consecutive ayat by surah so users see clear
// "Surah header → ayat" transitions when browsing across surah boundaries
// (juz, hizb, ruku, manzil, page).

import { AyahCard } from "@/components/quran/ayah-card";
import { Link } from "@/i18n/routing";
import { type Ayah, getSurahByNumber, loadAyah } from "@/lib/quran";

type Props = {
  keys: string[]; // ordered list of "s:a"
  emptyLabel?: string;
};

type Group = { surah: number; ayat: Ayah[] };

export async function AyahList({ keys, emptyLabel = "No ayat in this range." }: Props) {
  if (!keys.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  // Group by surah while preserving order. loadAyah reads per-surah so we cache
  // by surah number.
  const groups: Group[] = [];
  let cursor: Group | null = null;
  for (const key of keys) {
    const [sStr, aStr] = key.split(":");
    const s = Number(sStr);
    const a = Number(aStr);
    if (!cursor || cursor.surah !== s) {
      cursor = { surah: s, ayat: [] };
      groups.push(cursor);
    }
    const loaded = await loadAyah(s, a);
    if (loaded) cursor.ayat.push(loaded);
  }

  return (
    <div className="mt-8 space-y-10">
      {groups.map((g) => {
        const surah = getSurahByNumber(g.surah);
        if (!surah) return null;
        return (
          <section key={g.surah} aria-labelledby={`surah-${g.surah}`}>
            <header className="mb-4 flex items-baseline justify-between gap-4 border-b border-separator pb-3">
              <div>
                <h2 id={`surah-${g.surah}`} className="text-lg font-semibold tracking-title">
                  {surah.number}. {surah.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {surah.englishTranslation} · showing {g.ayat.length} of {surah.ayahCount} ayat
                </p>
              </div>
              <Link href={`/quran/${surah.slug}`} className="text-xs text-accent hover:underline">
                Read full surah →
              </Link>
            </header>
            <ol className="space-y-6">
              {g.ayat.map((a) => (
                <li key={`${a.surah}:${a.ayah}`}>
                  <AyahCard ayah={a} surahSlug={surah.slug} surahName={surah.name} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
