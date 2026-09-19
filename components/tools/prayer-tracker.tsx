"use client";
// Minimal, respectful prayer tracker — no gamification. Just: prayed on time,
// prayed late, or blank. Streak is a gentle nudge, not a "score".

import { getStore, logPrayer } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type PrayerKey = (typeof PRAYERS)[number];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(record: Record<string, Partial<Record<PrayerKey, unknown>>>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = isoDate(d);
    const entry = record[key];
    const complete = entry && PRAYERS.every((p) => entry[p]);
    if (i === 0 && !complete) {
      // Today may still be in progress. Skip and start counting from yesterday.
      continue;
    }
    if (complete) streak++;
    else break;
  }
  return streak;
}

export function PrayerTracker() {
  const t = useTranslations("tools.prayerTracker");
  const pn = useTranslations("prayer.prayers");
  const [today] = useState(() => isoDate(new Date()));
  const [record, setRecord] = useState(() => getStore().prayerTracker);
  // Render the "today" heading only on the client. Server and client ICU
  // libraries can disagree on subtle format details for the same locale (e.g.
  // Node vs Chrome format 'en-GB' full date differently — one has a comma,
  // one doesn't), which trips React's hydration mismatch check. Deferring the
  // format to the client sidesteps that entirely.
  const [displayDate, setDisplayDate] = useState<string>("");

  useEffect(() => {
    setDisplayDate(new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(new Date()));
    const listen = () => setRecord(getStore().prayerTracker);
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, []);

  const streak = useMemo(() => computeStreak(record), [record]);
  const todayEntry = record[today] ?? {};

  return (
    <div>
      <section className="rounded-2xl border border-separator bg-surface p-6">
        <p
          className="text-xs uppercase tracking-widest text-muted-foreground"
          suppressHydrationWarning
        >
          {displayDate || "\u00a0"}
        </p>
        <ul className="mt-4 divide-y divide-separator">
          {PRAYERS.map((p) => {
            const status = todayEntry[p];
            return (
              <li key={p} className="py-3 flex items-center justify-between gap-3">
                <p className="font-semibold tracking-title">{pn(p)}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      logPrayer(today, p, "onTime");
                      setRecord(getStore().prayerTracker);
                    }}
                    aria-pressed={status === "onTime"}
                    className={`focus-ring inline-flex items-center rounded-lg border px-3 h-10 text-xs transition-colors duration-micro ease-spring ${
                      status === "onTime"
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-separator bg-background hover:bg-muted"
                    }`}
                  >
                    {t("onTime")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logPrayer(today, p, "late");
                      setRecord(getStore().prayerTracker);
                    }}
                    aria-pressed={status === "late"}
                    className={`focus-ring inline-flex items-center rounded-lg border px-3 h-10 text-xs transition-colors duration-micro ease-spring ${
                      status === "late"
                        ? "border-foreground bg-muted"
                        : "border-separator bg-background hover:bg-muted"
                    }`}
                  >
                    {t("late")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-separator bg-surface p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("streak")}</p>
        <p className="mt-2 text-5xl font-bold tabular-nums">{streak}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("days")}</p>
      </section>
    </div>
  );
}
