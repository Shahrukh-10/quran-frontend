"use client";
// Prayer times panel that geolocates the user. Falls back to a city-picker prompt.
// All computation is on-device via lib/prayer-times.ts.

import {
  type ComputedTimes,
  METHODS,
  type MethodId,
  computePrayerTimes,
  formatLocalTime,
  nextPrayer,
} from "@/lib/prayer-times";
import { getStore, updateSettings } from "@/lib/storage";
import { Loader2Icon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "idle" | "locating" | "ready" | "denied" | "unsupported";

export function PrayerTimesGeolocated() {
  const t = useTranslations("prayer.index");
  const p = useTranslations("prayer.prayers");
  const ss = useTranslations("prayer.settings");
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [settings, setSettings] = useState(() => getStore().settings);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setSettings(getStore().settings);
    const onChange = () => setSettings(getStore().settings);
    window.addEventListener("iw:storage", onChange);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.removeEventListener("iw:storage", onChange);
      window.clearInterval(tick);
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("ready");
      },
      () => setStatus("denied"),
      { maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  const times = useMemo<ComputedTimes | null>(() => {
    if (!coords) return null;
    return computePrayerTimes({
      lat: coords.lat,
      lon: coords.lon,
      method: settings.calcMethod as MethodId,
      madhab: settings.madhab,
    });
  }, [coords, settings.calcMethod, settings.madhab]);

  const upcoming = times ? nextPrayer(now, times) : null;

  return (
    <section className="rounded-2xl border border-separator bg-surface p-6">
      {status === "idle" && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={request}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-4 h-11 font-medium transition-colors duration-micro ease-spring hover:opacity-90"
          >
            <MapPinIcon size={16} />
            {t("useLocation")}
          </button>
          <p className="text-sm text-muted-foreground">{t("orCity")}</p>
        </div>
      )}
      {status === "locating" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon size={16} className="animate-spin" />
          {t("useLocation")}…
        </p>
      )}
      {(status === "denied" || status === "unsupported") && (
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      )}
      {status === "ready" && times && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((k) => (
              <div
                key={k}
                className={`rounded-lg border p-3 ${
                  upcoming === k
                    ? "border-accent bg-accent-muted"
                    : "border-separator bg-background"
                }`}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {p(k)}
                  {upcoming === k && (
                    <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] text-[hsl(var(--accent-foreground))]">
                      {t("next")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatLocalTime(times[k])}
                </p>
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
        </div>
      )}
    </section>
  );
}
