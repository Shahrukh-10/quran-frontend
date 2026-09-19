"use client";
// Client-side plan progress tracker. Reads/writes localStorage via lib/storage.ts
// so it must be a client component; the surrounding page header renders on the server.

import { Link } from "@/i18n/routing";
import type { Plan } from "@/lib/plans";
import { getSurahByNumber } from "@/lib/quran";
import {
  getUserPlan,
  markPlanDayComplete,
  startPlan,
} from "@/lib/storage";
import { useCallback, useEffect, useState } from "react";

type UserPlanState = ReturnType<typeof getUserPlan>;

type Props = {
  planId: string;
  plan: Plan;
};

export function PlanTracker({ planId, plan }: Props) {
  // `mounted` gates state that comes from localStorage; SSR renders a stable
  // placeholder and the real state is filled in on the client after hydration.
  const [mounted, setMounted] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlanState>(undefined);

  useEffect(() => {
    setMounted(true);
    setUserPlan(getUserPlan(planId));
    const listen = () => setUserPlan(getUserPlan(planId));
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, [planId]);

  const handleStart = useCallback(() => {
    startPlan(planId);
    setUserPlan(getUserPlan(planId));
  }, [planId]);

  const handleToggle = useCallback(
    (day: number) => {
      markPlanDayComplete(planId, day);
      setUserPlan(getUserPlan(planId));
    },
    [planId],
  );

  // Pre-hydration placeholder to keep server/client markup stable.
  if (!mounted) {
    return (
      <div
        className="mt-10 h-24 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
        aria-hidden="true"
      />
    );
  }

  if (!userPlan) {
    return (
      <div className="mt-10 rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Your progress is saved on this device only — no account required.
        </p>
        <button
          type="button"
          onClick={handleStart}
          className="focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Start this plan
        </button>
      </div>
    );
  }

  const completed = userPlan.completedDays.length;
  const percent = Math.round((completed / plan.totalDays) * 100);
  const currentDay = userPlan.currentDay;

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-medium">
            Day {Math.min(currentDay, plan.totalDays)} of {plan.totalDays}
          </p>
          <p className="text-xs text-muted-foreground">
            {completed} / {plan.totalDays} complete ({percent}%)
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% complete`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ol className="mt-6 space-y-2">
        {plan.days.map((day) => {
          const isDone = userPlan.completedDays.includes(day.day);
          const isToday = day.day === currentDay;
          const label = `Day ${day.day}: ${day.title}`;

          let href: string | null = null;
          if (typeof day.juz === "number") {
            href = `/quran/juz/${day.juz}`;
          } else if (typeof day.surah === "number") {
            const s = getSurahByNumber(day.surah);
            if (s) href = `/quran/${s.slug}`;
          }

          return (
            <li
              key={day.day}
              className={`rounded-xl border bg-card p-4 transition ${
                isToday ? "border-accent shadow-sm" : "border-border/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <label className="mt-0.5 flex min-h-6 min-w-6 items-center">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggle(day.day)}
                    aria-label={`Mark ${label} as ${isDone ? "incomplete" : "complete"}`}
                    className="focus-ring h-5 w-5 rounded border-border/70 accent-accent"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Day {day.day}
                    </span>
                    {isToday ? (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-1 text-sm font-semibold ${isDone ? "line-through opacity-70" : ""}`}>
                    {href ? (
                      <Link href={href} className="focus-ring hover:underline">
                        {day.title}
                      </Link>
                    ) : (
                      day.title
                    )}
                  </p>
                  {day.reflection ? (
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {day.reflection}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
