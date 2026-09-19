"use client";
// Reading-goal dashboard. The whole page is a client component because every
// piece of state on it (goal config, streak, activity heatmap) lives in
// localStorage — there is nothing meaningful to render on the server. We use
// the mounted-guard pattern: SSR + first client paint render an inert
// "Loading" shell so hydration attributes stay stable, then the real user
// data swaps in on mount. See components/settings/settings-panel.tsx for the
// same pattern.

import {
  getReadingGoal,
  getStreak,
  setReadingGoal,
} from "@/lib/storage";
import { useCallback, useEffect, useMemo, useState } from "react";

type Goal = ReturnType<typeof getReadingGoal>;
type Streak = ReturnType<typeof getStreak>;
type Pace = "juz-per-day" | "hizb-per-day" | "custom";

// ── Date helpers (local time; keep in sync with lib/storage.ts) ──────────────

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isoPlusDays(iso: string, delta: number): string {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map((n) => Number.parseInt(n, 10));
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + delta);
  const yy = t.getFullYear();
  const mm = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function daysBetween(a: string, b: string): number {
  const [ay = 1970, am = 1, ad = 1] = a.split("-").map((n) => Number.parseInt(n, 10));
  const [by = 1970, bm = 1, bd = 1] = b.split("-").map((n) => Number.parseInt(n, 10));
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86_400_000);
}

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Progress ring (pure SVG, no chart lib) ───────────────────────────────────

function ProgressRing({
  percent,
  size = 180,
  stroke = 14,
  label,
  sublabel,
}: {
  percent: number; // 0..1
  size?: number;
  stroke?: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.max(0, Math.min(1, percent));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped);
  return (
    <div
      role="img"
      aria-label={`${Math.round(clamped * 100)}% of plan elapsed`}
      style={{ position: "relative", width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <title>Reading plan progress</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.1 }}>{label}</span>
        {sublabel ? (
          <span style={{ fontSize: 12, opacity: 0.6 }}>{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}

// ── Activity heatmap ─────────────────────────────────────────────────────────

const HEATMAP_WEEKS = 12; // 12 columns × 7 rows = 84 days

function ActivityHeatmap({ activityDates }: { activityDates: string[] }) {
  const set = useMemo(() => new Set(activityDates), [activityDates]);
  const today = todayLocalISO();
  const todayDate = new Date();

  // Build a 12 × 7 grid where the RIGHTMOST column ends on today. Each column
  // is a calendar week (Sun..Sat) of 7 cells, oldest week on the left.
  // Cells beyond today (within the current week) are marked as "future".
  const cells: Array<{ iso: string; state: "hit" | "miss" | "future" }> = [];
  const endOfCurrentWeek = new Date(todayDate);
  // Advance to Saturday of the current week (JS: Sun=0..Sat=6).
  endOfCurrentWeek.setDate(endOfCurrentWeek.getDate() + (6 - endOfCurrentWeek.getDay()));

  const totalCells = HEATMAP_WEEKS * 7;
  const start = new Date(endOfCurrentWeek);
  start.setDate(start.getDate() - (totalCells - 1));

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = isoFromDate(d);
    let state: "hit" | "miss" | "future";
    if (iso > today) state = "future";
    else if (set.has(iso)) state = "hit";
    else state = "miss";
    cells.push({ iso, state });
  }

  // Re-index so we render column-major (each column = one week).
  const columns: Array<typeof cells> = [];
  for (let col = 0; col < HEATMAP_WEEKS; col++) {
    const week: typeof cells = [];
    for (let row = 0; row < 7; row++) {
      const cell = cells[col * 7 + row];
      if (cell) week.push(cell);
    }
    columns.push(week);
  }

  return (
    <div
      role="img"
      aria-label={`Reading activity, last ${HEATMAP_WEEKS * 7} days`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${HEATMAP_WEEKS}, 1fr)`,
        gap: 4,
        width: "100%",
        maxWidth: 420,
      }}
    >
      {columns.map((week, colIdx) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed column order per render
          key={colIdx}
          style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 4 }}
        >
          {week.map((cell) => (
            <div
              key={cell.iso}
              title={cell.iso}
              aria-hidden="true"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 3,
                background:
                  cell.state === "hit"
                    ? "#22c55e"
                    : cell.state === "future"
                      ? "rgba(120,120,120,0.18)"
                      : "rgba(120,120,120,0.35)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Goal setup form ──────────────────────────────────────────────────────────

function GoalSetupCard({ onSaved }: { onSaved: () => void }) {
  const [targetDate, setTargetDate] = useState<string>(() =>
    isoPlusDays(todayLocalISO(), 30),
  );
  const [pace, setPace] = useState<Pace>("juz-per-day");
  const [customAyat, setCustomAyat] = useState<number>(20);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!targetDate) return;
      setReadingGoal({
        targetDate,
        startedAt: Date.now(),
        pace,
        ...(pace === "custom" ? { customAyatPerDay: customAyat } : {}),
      });
      onSaved();
    },
    [targetDate, pace, customAyat, onSaved],
  );

  return (
    <form onSubmit={handleSubmit} className="hig-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Set a reading goal</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 14 }}>
            Pick a date to finish and a daily pace. Progress is tracked on this device only.
          </p>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Target date</span>
          <input
            type="date"
            required
            min={todayLocalISO()}
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(120,120,120,0.35)",
              fontSize: 15,
              background: "transparent",
              color: "inherit",
              minHeight: 44,
            }}
          />
        </label>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Pace</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(
              [
                { id: "juz-per-day" as const, label: "1 Juz / day (~30 day plan)" },
                { id: "hizb-per-day" as const, label: "1 Hizb / day (~60 day plan)" },
                { id: "custom" as const, label: "Custom ayat / day" },
              ]
            ).map((opt) => (
              <label
                key={opt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border:
                    pace === opt.id
                      ? "1px solid rgba(34,197,94,0.7)"
                      : "1px solid rgba(120,120,120,0.25)",
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                <input
                  type="radio"
                  name="pace"
                  value={opt.id}
                  checked={pace === opt.id}
                  onChange={() => setPace(opt.id)}
                />
                <span style={{ fontSize: 15 }}>{opt.label}</span>
              </label>
            ))}
            {pace === "custom" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Ayat per day</span>
                <input
                  type="number"
                  min={1}
                  max={6236}
                  value={customAyat}
                  onChange={(e) =>
                    setCustomAyat(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                  }
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(120,120,120,0.35)",
                    fontSize: 15,
                    background: "transparent",
                    color: "inherit",
                    minHeight: 44,
                    maxWidth: 160,
                  }}
                />
              </label>
            ) : null}
          </div>
        </fieldset>

        <button
          type="submit"
          style={{
            alignSelf: "flex-start",
            padding: "12px 20px",
            borderRadius: 10,
            border: 0,
            background: "#22c55e",
            color: "white",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Save goal
        </button>
      </div>
    </form>
  );
}

// ── Active goal view ─────────────────────────────────────────────────────────

function ActiveGoalView({
  goal,
  streak,
  onClear,
}: {
  goal: NonNullable<Goal>;
  streak: Streak;
  onClear: () => void;
}) {
  const today = todayLocalISO();
  const startISO = isoFromDate(new Date(goal.startedAt));
  const totalDays = Math.max(1, daysBetween(startISO, goal.targetDate) + 1);
  const rawElapsed = daysBetween(startISO, today) + 1;
  const dayN = Math.max(1, Math.min(totalDays, rawElapsed));
  const percent = Math.max(0, Math.min(1, rawElapsed / totalDays));

  const paceLabel =
    goal.pace === "juz-per-day"
      ? "1 Juz / day"
      : goal.pace === "hizb-per-day"
        ? "1 Hizb / day"
        : `${goal.customAyatPerDay ?? 0} ayat / day`;

  const handleClear = useCallback(() => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Clear this reading goal? Your streak history is kept.");
    if (!ok) return;
    setReadingGoal(null);
    onClear();
  }, [onClear]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        className="hig-card"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 24,
          alignItems: "center",
        }}
      >
        <ProgressRing
          percent={percent}
          label={`Day ${dayN}`}
          sublabel={`of ${totalDays}`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, opacity: 0.6, letterSpacing: 0.4, textTransform: "uppercase" }}>
            Reading plan
          </div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{paceLabel}</div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            Finish by <strong>{goal.targetDate}</strong>
          </div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {Math.round(percent * 100)}% of plan elapsed
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              alignSelf: "flex-start",
              marginTop: 8,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(120,120,120,0.35)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
              cursor: "pointer",
              minHeight: 36,
            }}
          >
            Clear goal
          </button>
        </div>
      </div>

      <div
        className="hig-card"
        style={{
          padding: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <div>
          <div
            style={{ fontSize: 13, opacity: 0.6, letterSpacing: 0.4, textTransform: "uppercase" }}
          >
            Streak
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 600 }} aria-hidden="true">
              🔥
            </span>
            <span style={{ fontSize: 34, fontWeight: 600 }}>{streak.current}</span>
            <span style={{ fontSize: 14, opacity: 0.7 }}>
              current day{streak.current === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
            longest: {streak.longest} day{streak.longest === 1 ? "" : "s"}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.6,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Last 12 weeks
          </div>
          <ActivityHeatmap activityDates={streak.activityDates} />
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  // Mounted-guard: SSR + first paint show an inert shell so hydration is stable.
  const [mounted, setMounted] = useState(false);
  const [goal, setGoal] = useState<Goal>(null);
  const [streak, setStreak] = useState<Streak>({
    current: 0,
    longest: 0,
    lastActivityDate: "",
    activityDates: [],
  });

  const refresh = useCallback(() => {
    setGoal(getReadingGoal());
    setStreak(getStreak());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const listen = () => refresh();
    window.addEventListener("iw:storage", listen);
    return () => window.removeEventListener("iw:storage", listen);
  }, [refresh]);

  return (
    <>
      <section className="section section--hero">
        <div className="container container--narrow">
          <span className="eyebrow">Reading</span>
          <h1 className="page-title">Reading goal</h1>
          <p className="page-lede">
            Set a target date to finish the Quran, watch your daily streak, and see the last
            twelve weeks of reading activity. Everything stays on this device.
          </p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container container--narrow">
          {!mounted ? (
            <div className="hig-card" style={{ padding: 24 }} aria-busy="true">
              Loading…
            </div>
          ) : goal ? (
            <ActiveGoalView goal={goal} streak={streak} onClear={refresh} />
          ) : (
            <GoalSetupCard onSaved={refresh} />
          )}
        </div>
      </section>
    </>
  );
}
