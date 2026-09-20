"use client";
// Ramadan fasting tracker. Renders a 30-day grid of Ramadan check-boxes
// backed by localStorage `iw.v1.fastingLog` (ISO date → boolean).
//
// Hydration story: the parent server component computes `ramadanDates` and
// `dayOfRamadan` from today's Hijri date and hands them in as props, so this
// component never has to do Hijri math on the client. Reading the actual
// tick state is deferred to useEffect because it depends on localStorage
// which doesn't exist on the server.

import { getStore, logFast } from "@/lib/storage";
import { useEffect, useState } from "react";

const EV_STORAGE = "iw:storage";

type Props = {
  /** 30 ISO dates (yyyy-mm-dd), day 1 → day 30 of this Ramadan. */
  ramadanDates: string[];
  /**
   * The Ramadan day (1-30) matching `today` on the server render. Recomputed
   * client-side after hydration to catch late-night users.
   */
  dayOfRamadan: number | null;
  labels: {
    day: string;
    fasted: string;
    notFasted: string;
    complete: string;
    upcoming: string;
    aria: string;
    resetLabel: string;
    resetConfirm: string;
  };
};

export function FastingTracker({ ramadanDates, dayOfRamadan: initialDay, labels }: Props) {
  // `fasted[date]` — client state. Server render leaves this empty; client
  // fills it from localStorage after hydration.
  const [fasted, setFasted] = useState<Record<string, boolean>>({});
  const [today] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  useEffect(() => {
    const load = () => {
      setFasted({ ...getStore().fastingLog });
    };
    load();
    window.addEventListener(EV_STORAGE, load);
    return () => window.removeEventListener(EV_STORAGE, load);
  }, []);

  const toggle = (date: string) => {
    const next = !fasted[date];
    logFast(date, next);
    setFasted((prev) => ({ ...prev, [date]: next }));
  };

  const reset = () => {
    if (!window.confirm(labels.resetConfirm)) return;
    for (const d of ramadanDates) logFast(d, false);
    setFasted({});
  };

  const completed = ramadanDates.filter((d) => fasted[d]).length;
  const percent = Math.round((completed / 30) * 100);

  return (
    <section aria-label={labels.aria} className="ramadan-tracker">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm">
          <strong>
            {completed} / 30 {labels.day}
          </strong>{" "}
          <span className="text-muted-foreground">· {percent}%</span>
        </p>
        <button
          type="button"
          onClick={reset}
          className="focus-ring text-xs text-muted-foreground hover:text-foreground underline"
        >
          {labels.resetLabel}
        </button>
      </div>

      <ol
        role="list"
        className="grid grid-cols-6 sm:grid-cols-10 gap-2"
      >
        {ramadanDates.map((iso, i) => {
          const dayNum = i + 1;
          const done = !!fasted[iso];
          const isToday = iso === today;
          const isUpcoming = iso > today;
          return (
            <li key={iso}>
              <button
                type="button"
                onClick={() => toggle(iso)}
                aria-pressed={done}
                aria-label={`${labels.day} ${dayNum}: ${done ? labels.fasted : labels.notFasted}${
                  isToday ? " (today)" : ""
                }`}
                className={`focus-ring w-full aspect-square rounded-lg border text-sm font-medium transition-colors duration-micro ease-spring ${
                  done
                    ? "bg-accent border-accent text-[hsl(var(--accent-foreground))]"
                    : isToday
                      ? "border-accent text-accent bg-accent-muted"
                      : isUpcoming
                        ? "border-separator bg-muted/40 text-muted-foreground"
                        : "border-separator bg-surface hover:bg-muted text-foreground"
                }`}
              >
                {dayNum}
              </button>
            </li>
          );
        })}
      </ol>

      {initialDay !== null && (
        <p className="mt-4 text-xs text-muted-foreground">
          {labels.day} {initialDay} · {today}
        </p>
      )}
    </section>
  );
}
