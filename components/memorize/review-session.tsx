"use client";
// Review session — the main SR loop. Shows one card at a time.
// User attempts to recall the ayah, self-rates their memory, and moves on.
//
// Verse content is fetched on demand from /api/ayah/[surah]/[ayah] as we
// walk through the queue — no giant bundle preload. Answers cached in
// component state so revisiting an earlier card doesn't refetch.

import { Link } from "@/i18n/routing";
import { dueCards, type Rating } from "@/lib/memorize";
import { TRANSLATIONS } from "@/lib/quran";
import { getAllMemoCards, getStore, reviewMemoCard } from "@/lib/storage";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Answer = { arabic: string; translation: string };

export function ReviewSession() {
  const t = useTranslations("memorize.review");
  const locale = useLocale();
  const [queue, setQueue] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [cache, setCache] = useState<Record<string, Answer | null>>({});

  useEffect(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const due = dueCards(getAllMemoCards(), todayISO);
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setQueue(shuffled.map((c) => c.verseKey));
    setLoaded(true);
  }, []);

  const currentKey = queue[idx];

  // Fetch on demand as the queue advances.
  useEffect(() => {
    if (!currentKey || currentKey in cache) return;
    const [s, a] = currentKey.split(":").map(Number);
    if (!s || !a) return;
    fetch(`/api/ayah/${s}/${a}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const translationId =
          getStore().settings?.translation ??
          (locale === "id" ? "id.indonesian" : "en.sahih");
        if (!data) {
          setCache((prev) => ({ ...prev, [currentKey]: null }));
          return;
        }
        setCache((prev) => ({
          ...prev,
          [currentKey]: {
            arabic: data.arabic ?? "",
            translation:
              data.translations?.[translationId] ??
              data.translations?.["en.sahih"] ??
              "",
          },
        }));
      })
      .catch(() => {
        setCache((prev) => ({ ...prev, [currentKey]: null }));
      });
  }, [currentKey, cache, locale]);

  const rate = useCallback(
    (rating: Rating) => {
      if (!currentKey) return;
      reviewMemoCard(currentKey, rating);
      setCompleted((n) => n + 1);
      setRevealed(false);
      setIdx((n) => n + 1);
    },
    [currentKey],
  );

  if (!loaded) {
    return <p className="mt-8 text-center text-muted-foreground">{t("loading")}</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-separator bg-surface p-8 text-center">
        <p className="text-lg font-semibold tracking-title">{t("noDue")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("noDueHint")}</p>
        <Link
          href="/memorize"
          className="focus-ring mt-6 inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator hover:bg-muted"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="mt-10 rounded-2xl border border-accent bg-accent-muted p-8 text-center">
        <p className="text-lg font-semibold tracking-title text-accent">{t("sessionComplete")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("completedCount", { count: completed })}
        </p>
        <Link
          href="/memorize"
          className="focus-ring mt-6 inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  const current = currentKey ? cache[currentKey] : undefined;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>{t("progress", { current: idx + 1, total: queue.length })}</span>
        <span>{currentKey}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-separator bg-surface p-6 sm:p-8 min-h-[280px]">
        {current === undefined ? (
          <p className="text-muted-foreground text-center py-16">{t("loadingVerse")}</p>
        ) : current === null ? (
          <p className="text-muted-foreground text-center py-16">
            {t("verseUnavailable", { verseKey: currentKey ?? "" })}
          </p>
        ) : (
          <>
            <div
              className="font-quran text-4xl sm:text-4xl leading-[2.0] text-right transition-[filter]"
              style={{
                filter: revealed ? "none" : "blur(14px)",
                userSelect: revealed ? "auto" : "none",
              }}
              aria-hidden={!revealed}
              lang="ar"
              dir="rtl"
            >
              {current.arabic}
            </div>

            <p className="mt-6 text-lg leading-relaxed">&ldquo;{current.translation}&rdquo;</p>

            {!revealed && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="focus-ring mt-6 inline-flex items-center justify-center min-h-11 px-6 rounded-lg border border-separator hover:bg-muted font-medium"
              >
                {t("showAnswer")}
              </button>
            )}
          </>
        )}
      </div>

      {revealed && current && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => rate("again")}
            className="focus-ring rounded-lg border border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 min-h-11 font-medium hover:bg-red-500/20"
          >
            {t("again")}
          </button>
          <button
            type="button"
            onClick={() => rate("hard")}
            className="focus-ring rounded-lg border border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-300 min-h-11 font-medium hover:bg-orange-500/20"
          >
            {t("hard")}
          </button>
          <button
            type="button"
            onClick={() => rate("good")}
            className="focus-ring rounded-lg border border-accent bg-accent-muted text-accent min-h-11 font-medium hover:opacity-80"
          >
            {t("good")}
          </button>
          <button
            type="button"
            onClick={() => rate("easy")}
            className="focus-ring rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 min-h-11 font-medium hover:bg-emerald-500/20"
          >
            {t("easy")}
          </button>
        </div>
      )}

      {/* TRANSLATIONS import is used implicitly for typing — keep it to avoid tree-shake surprise. */}
      <span className="sr-only" aria-hidden>
        {TRANSLATIONS.length}
      </span>
    </div>
  );
}
