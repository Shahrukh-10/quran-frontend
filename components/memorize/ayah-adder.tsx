"use client";
// One-juz ayah picker. Shows every ayah in the juz with an add/remove toggle.
// User taps ayat they want in their memorization deck.

import { Link } from "@/i18n/routing";
import { addMemoCard, getAllMemoCards, removeMemoCard } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const EV_STORAGE = "iw:storage";

type AyahRow = {
  verseKey: string;
  surah: number;
  ayah: number;
  arabic: string;
  translation: string;
};

type Props = {
  juz: number;
  ayat: AyahRow[];
};

export function AyahAdder({ juz, ayat }: Props) {
  const t = useTranslations("memorize.ayahAdder");
  const [inDeck, setInDeck] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = () => setInDeck(new Set(getAllMemoCards().map((c) => c.verseKey)));
    load();
    window.addEventListener(EV_STORAGE, load);
    return () => window.removeEventListener(EV_STORAGE, load);
  }, []);

  const toggle = (verseKey: string) => {
    if (inDeck.has(verseKey)) {
      removeMemoCard(verseKey);
      setInDeck((prev) => {
        const next = new Set(prev);
        next.delete(verseKey);
        return next;
      });
    } else {
      addMemoCard(verseKey);
      setInDeck((prev) => new Set(prev).add(verseKey));
    }
  };

  const addedCount = useMemo(
    () => ayat.filter((a) => inDeck.has(a.verseKey)).length,
    [ayat, inDeck],
  );

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("progress", { added: addedCount, total: ayat.length })}
        </p>
        <Link href="/memorize" className="focus-ring text-sm text-accent hover:underline">
          {t("backToDashboard")}
        </Link>
      </div>

      <ol className="mt-6 space-y-3">
        {ayat.map((a) => {
          const added = inDeck.has(a.verseKey);
          return (
            <li key={a.verseKey}>
              <div
                className={`rounded-2xl border p-5 transition-colors duration-micro ease-spring ${
                  added ? "border-accent bg-accent-muted" : "border-separator bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{a.verseKey}</p>
                    <p
                      className="mt-2 font-quran text-4xl leading-[1.9] text-right"
                      lang="ar"
                      dir="rtl"
                    >
                      {a.arabic}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      &ldquo;{a.translation}&rdquo;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(a.verseKey)}
                    aria-pressed={added}
                    aria-label={
                      added
                        ? t("removeAriaLabel", { verseKey: a.verseKey })
                        : t("addAriaLabel", { verseKey: a.verseKey })
                    }
                    className={`focus-ring inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors ${
                      added
                        ? "bg-accent text-[hsl(var(--accent-foreground))]"
                        : "border border-separator hover:bg-muted"
                    }`}
                  >
                    {added ? t("remove") : t("add")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
