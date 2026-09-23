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
import { AlertCircleIcon, Loader2Icon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "idle" | "locating" | "ready" | "denied" | "unsupported" | "insecure";

export function PrayerTimesGeolocated() {
  const t = useTranslations("prayer.index");
  const p = useTranslations("prayer.prayers");
  const ss = useTranslations("prayer.settings");
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [settings, setSettings] = useState(() => getStore().settings);
  const [now, setNow] = useState(() => new Date());
  const [errorHint, setErrorHint] = useState<string | null>(null);

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
    // Geolocation is only granted in a "secure context" — HTTPS or localhost.
    // On plain-HTTP LAN (e.g. http://192.168.x.x) mobile browsers silently
    // reject with no permission prompt. Detect and message the user clearly
    // so they can either open the site over HTTPS or pick a city below.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("insecure");
      return;
    }
    setStatus("locating");
    setErrorHint(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        setStatus("denied");
        // Provide a specific hint so the user knows how to recover.
        if (err.code === err.PERMISSION_DENIED) {
          setErrorHint(
            "You blocked location access. Open Settings → Privacy → Location for this site to allow, or pick a city below.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setErrorHint(
            "Your device couldn't get a position right now. Move near a window, or pick a city below.",
          );
        } else if (err.code === err.TIMEOUT) {
          setErrorHint("Location request timed out. Try again or pick a city below.");
        } else {
          setErrorHint("Location unavailable. Pick a city below.");
        }
      },
      { maximumAge: 60_000, timeout: 10_000, enableHighAccuracy: false },
    );
  }, []);

  // Auto-request location on first mount. Browsers that have already
  // granted permission for this origin resolve immediately with no prompt;
  // first-time visitors see the browser's native permission dialog. If
  // location has been denied for this origin the promise rejects and the
  // component falls back to the "denied" state with a city picker — same
  // UX as pre-2026-09 code, just skipping the extra "Use my location"
  // button click for anyone who ever wants to grant permission.
  //
  // Secure-context guard is inside `request()` so plain-HTTP LAN dev shows
  // the "insecure" hint without the browser attempting a doomed prompt.
  useEffect(() => {
    if (status !== "idle") return;
    request();
    // Only fire the auto-request once at mount — subsequent changes to
    // `request` (stable via useCallback with []) or `status` should not
    // re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToCities = useCallback(() => {
    const el = document.querySelector(".cities");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      {(status === "denied" || status === "unsupported" || status === "insecure") && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-lg border border-separator bg-background/50 p-3 text-sm">
            <AlertCircleIcon size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              {status === "insecure"
                ? "Location works only over HTTPS. Pick a city below to see prayer times right now."
                : status === "unsupported"
                  ? "Your browser doesn't support location. Pick a city below."
                  : (errorHint ?? t("unavailable"))}
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToCities}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-4 h-11 font-medium transition-colors duration-micro ease-spring hover:opacity-90 self-start"
          >
            <MapPinIcon size={16} />
            Pick a city
          </button>
        </div>
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
