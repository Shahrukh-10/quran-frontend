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

  return (
    <section
      aria-labelledby="times-heading"
      className="rounded-2xl border border-separator bg-surface p-6"
    >
      <p id="times-heading" className="text-xs uppercase tracking-widest text-muted-foreground">
        Today · {cityName}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => (
          <div key={k} className="rounded-lg border border-separator bg-background p-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{p(k)}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{fmt.format(times[k])}</p>
          </div>
        ))}
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
