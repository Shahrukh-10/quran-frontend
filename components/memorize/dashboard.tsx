"use client";
// Memorization dashboard — hub for the SR tool.
// Shows: total cards, buckets (new/learning/reviewing/mature), due today count,
// and a link to start today's review session. Renders juz 1..30 as pickers.
//
// Client component — needs localStorage for card state, and this dashboard
// updates in real time as the user rates cards elsewhere in the app.

import { Link } from "@/i18n/routing";
import { cardStats, dueCards, type MemoCard } from "@/lib/memorize";
import { getAllMemoCards } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const EV_STORAGE = "iw:storage";

export function MemorizeDashboard() {
  const t = useTranslations("memorize.dashboard");
  const [cards, setCards] = useState<MemoCard[]>([]);
  const [today] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  useEffect(() => {
    const load = () => setCards(getAllMemoCards());
    load();
    window.addEventListener(EV_STORAGE, load);
    return () => window.removeEventListener(EV_STORAGE, load);
  }, []);

  const stats = cardStats(cards);
  const due = dueCards(cards, today);

  return (
    <div className="memorize-dashboard">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard label={t("statNew")} value={stats.new} />
        <StatCard label={t("statLearning")} value={stats.learning} />
        <StatCard label={t("statReviewing")} value={stats.reviewing} />
        <StatCard label={t("statMature")} value={stats.mature} />
      </div>

      <div className="mt-8 rounded-2xl border border-accent bg-accent-muted p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {t("dueTodayLabel")}
        </p>
        {due.length === 0 ? (
          <>
            <p className="mt-2 text-lg font-semibold tracking-title">
              {stats.total === 0 ? t("noCardsYet") : t("allCaughtUp")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.total === 0 ? t("addFirstHint") : t("returnTomorrow")}
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-semibold tracking-title">
              {t("dueTodayCount", { count: due.length })}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("dueTodayHint")}</p>
            <Link
              href="/memorize/review"
              className="focus-ring mt-4 inline-flex items-center justify-center min-h-11 px-6 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] font-medium transition-colors duration-micro ease-spring hover:opacity-90"
            >
              {t("reviewNow")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-separator bg-surface p-4 text-center">
      <p className="text-3xl font-bold tabular-nums tracking-title">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
    </div>
  );
}
