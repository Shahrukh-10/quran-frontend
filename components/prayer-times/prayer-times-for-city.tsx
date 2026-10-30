"use client";
// Prayer times panel pinned to a specific city (lat/lon known at build time).
// Renders in the city's local timezone using Intl.DateTimeFormat.

import { METHODS, type MethodId, computePrayerTimes } from "@/lib/prayer-times";
import { getStore, updateSettings } from "@/lib/storage";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

export function PrayerTimesForCity({
  lat,
  lon,
  tz,
  cityName,
}: {
  lat: number;
  lon: number;
  tz: string;
  cityName: string;
}) {
  const p = useTranslations("prayer.prayers");
  const ss = useTranslations("prayer.settings");
  const [now, setNow] = useState<Date>(() => new Date());
  const [settings, setSettings] = useState(() => getStore().settings);

  useEffect(() => {
    setSettings(getStore().settings);
    const listen = () => setSettings(getStore().settings);
    window.addEventListener("iw:storage", listen);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener("iw:storage", listen);
      window.clearInterval(tick);
    };
  }, []);

  // Persist the visited city as the homepage widget's location, so the home
  // "Today · <city>" card follows the last city the user picked here.
  // Overwrites any auto-geolocated fix — the user's explicit pick wins.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        "iw.home.loc.v1",
        JSON.stringify({
          at: Date.now(),
          loc: { coords: { lat, lon }, city: cityName },
        }),
      );
      // Notify the widget in the same tab
      window.dispatchEvent(new CustomEvent("iw:storage"));
    } catch {
      /* private mode / quota */
    }
  }, [lat, lon, cityName]);

  const times = useMemo(
    () =>
      computePrayerTimes({
        lat,
        lon,
        date: now,
        method: settings.calcMethod as MethodId,
        madhab: settings.madhab,
      }),
    [lat, lon, now, settings.calcMethod, settings.madhab],
  );

  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  });

  // Date shown is client-authoritative (`now` recomputes on hydration + every
  // 30s), so the "today" claim is always truthful even though the SSR snapshot
  // is built at deploy time.
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });

  // The next upcoming prayer (sunrise is not a prayer). Highlighted below so a
  // user glancing mid-day sees "what's next" without reading every row.
  const PRAYER_ORDER = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const nextKey = PRAYER_ORDER.find((k) => times[k].getTime() > now.getTime()) ?? "fajr";

  return (
    <section
      aria-labelledby="times-heading"
      className="rounded-2xl border border-separator bg-surface p-6"
    >
      <p id="times-heading" className="text-xs uppercase tracking-widest text-muted-foreground">
        Today · {cityName}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{dateFmt.format(now)}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => {
          const isNext = k === nextKey;
          return (
            <div
              key={k}
              className={`rounded-lg border p-3 ${
                isNext ? "border-accent bg-accent-muted" : "border-separator bg-background"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{p(k)}</p>
                {isNext ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent-foreground))]">
                    Next
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-lg font-semibold tabular-nums">{fmt.format(times[k])}</p>
            </div>
          );
        })}
      </div>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-muted-foreground focus-ring rounded px-1">
          Settings
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="block mb-1 text-xs text-muted-foreground uppercase tracking-widest">
              {ss("method")}
            </span>
            <select
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
              value={settings.calcMethod}
              onChange={(e) => updateSettings({ calcMethod: e.target.value })}
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="block mb-1 text-xs text-muted-foreground uppercase tracking-widest">
              {ss("madhab")}
            </span>
            <select
              className="focus-ring h-11 w-full rounded-lg border border-separator bg-background px-3 text-sm"
              value={settings.madhab}
              onChange={(e) => updateSettings({ madhab: e.target.value as "shafi" | "hanafi" })}
            >
              <option value="shafi">{ss("shafi")}</option>
              <option value="hanafi">{ss("hanafi")}</option>
            </select>
          </label>
        </div>
      </details>
    </section>
  );
}
