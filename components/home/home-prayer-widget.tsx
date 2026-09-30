"use client";
// Real-time prayer widget for the homepage. Replaces the previous static
// "Sample times for New Delhi" card. On first load it asks the browser for
// location (once — never re-prompts if the user granted or denied it before)
// and displays true prayer times computed on-device by lib/prayer-times.
//
// If the user denies / the browser doesn't support geolocation / the page is
// on plain HTTP, we fall back to reverse-geocoded IP OR a link to pick a city.
// City name comes from Intl.DateTimeFormat resolved options + a lightweight
// reverse-geocode via api.bigdatacloud.net (client-side, no key required).
//
// Auto-refresh: recomputes on window focus, on `iw:storage` (settings change),
// and every 30 s so the "next prayer" countdown never goes stale.

import { Link } from "@/i18n/routing";
import {
  type ComputedTimes,
  type MethodId,
  computePrayerTimes,
  formatLocalTime,
  nextPrayer,
} from "@/lib/prayer-times";
import { getStore } from "@/lib/storage";
import { useCallback, useEffect, useMemo, useState } from "react";

type Coords = { lat: number; lon: number };
type LocInfo = { coords: Coords; city: string; countryCode?: string };

const LOC_CACHE_KEY = "iw.home.loc.v1";
const LOC_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h

function readCachedLoc(): LocInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; loc: LocInfo };
    if (!parsed?.at || !parsed?.loc?.coords) return null;
    if (Date.now() - parsed.at > LOC_MAX_AGE_MS) return null;
    return parsed.loc;
  } catch {
    return null;
  }
}

function writeCachedLoc(loc: LocInfo) {
  try {
    window.localStorage.setItem(
      LOC_CACHE_KEY,
      JSON.stringify({ at: Date.now(), loc }),
    );
  } catch {
    /* quota / private mode */
  }
}

async function reverseGeocode(coords: Coords): Promise<string> {
  // Free, keyless, low-quota client-side reverse-geocode.
  // If it fails, degrade to "Your location".
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lon}&localityLanguage=en`,
      { cache: "force-cache" },
    );
    if (!res.ok) return "Your location";
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      countryName?: string;
      principalSubdivision?: string;
    };
    return (
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      data.countryName ||
      "Your location"
    );
  } catch {
    return "Your location";
  }
}

const PRAYER_LABELS = [
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
] as const;

const METHOD_LABEL: Record<string, string> = {
  MWL: "Muslim World League",
  ISNA: "ISNA",
  EGYPT: "Egyptian",
  MAKKAH: "Umm al-Qura (Makkah)",
  KARACHI: "Karachi (Univ. of Islamic Sciences)",
  TEHRAN: "Tehran",
  DUBAI: "Dubai",
  KUWAIT: "Kuwait",
  QATAR: "Qatar",
  SINGAPORE: "Singapore",
  TURKEY: "Turkey (Diyanet)",
  MOONSIGHTING: "Moonsighting Committee",
  NORTH_AMERICA: "North America",
};

export function HomePrayerWidget() {
  const [loc, setLoc] = useState<LocInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "denied">("idle");
  const [now, setNow] = useState<Date>(() => new Date());
  const [settings, setSettings] = useState(() => getStore().settings);

  // Kick off location on mount. Cached value → immediate render, otherwise
  // ask the browser once. Never re-prompts if denied.
  useEffect(() => {
    const cached = readCachedLoc();
    if (cached) {
      setLoc(cached);
      setStatus("ready");
      // Refresh reverse-geocode label in background if it looks like a
      // fallback string — but don't re-prompt for location.
      if (cached.city === "Your location") {
        reverseGeocode(cached.coords).then((city) => {
          if (city !== "Your location") {
            const next = { ...cached, city };
            setLoc(next);
            writeCachedLoc(next);
          }
        });
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const city = await reverseGeocode(coords);
        const next: LocInfo = { coords, city };
        setLoc(next);
        setStatus("ready");
        writeCachedLoc(next);
      },
      () => setStatus("denied"),
      { maximumAge: 5 * 60 * 1000, timeout: 8_000, enableHighAccuracy: false },
    );
  }, []);

  // Re-render every 30 s for the countdown; refresh settings on storage events.
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    const onStore = () => {
      setSettings(getStore().settings);
      // A city or method change from /prayer-times may have written a new
      // cached location — pick it up.
      const cached = readCachedLoc();
      if (cached) {
        setLoc(cached);
        setStatus("ready");
      }
    };
    const onFocus = () => setNow(new Date());
    window.addEventListener("iw:storage", onStore);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("iw:storage", onStore);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const times = useMemo<ComputedTimes | null>(() => {
    if (!loc) return null;
    return computePrayerTimes({
      lat: loc.coords.lat,
      lon: loc.coords.lon,
      method: (settings.calcMethod as MethodId) ?? "KARACHI",
      madhab: settings.madhab ?? "shafi",
    });
  }, [loc, settings.calcMethod, settings.madhab]);

  const upcoming = times ? nextPrayer(now, times) : null;

  const nextInfo = useMemo(() => {
    if (!times || !upcoming) return null;
    const target = times[upcoming];
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const totalMin = Math.round(diffMs / 60_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const label =
      h > 0 ? `in ${h}h ${m}m` : m > 0 ? `in ${m} min` : "starting now";
    return {
      name: PRAYER_LABELS.find((p) => p.key === upcoming)?.label ?? upcoming,
      time: formatLocalTime(target),
      countdown: label,
    };
  }, [times, upcoming, now]);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

  const methodLabel =
    METHOD_LABEL[settings.calcMethod as string] ??
    (settings.calcMethod as string) ??
    "";

  // Skeleton while locating (before we know if we have a fix or not)
  if (status === "locating" && !loc) {
    return (
      <div className="section__head">
        <div>
          <h2>Today · Locating…</h2>
          <p>Detecting your location for accurate prayer times.</p>
        </div>
      </div>
    );
  }

  // Denied / unsupported → prompt to pick a city, no fake data
  if (status === "denied" || !loc || !times) {
    return (
      <>
        <div className="section__head">
          <div>
            <h2>Today · Prayer times</h2>
            <p>Choose a city to see accurate times for today.</p>
          </div>
          <Link className="section__link hstack" href="/prayer-times">
            Pick a city{" "}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <Link
          href="/prayer-times"
          className="prayer-card block !no-underline"
          aria-label="Set your city to see prayer times"
          style={{ textDecoration: "none" }}
        >
          <div>
            <div className="prayer-card__label">No location yet</div>
            <div className="prayer-card__next">
              <span className="prayer-card__accent">Tap here</span> · set your city
            </div>
            <div className="prayer-card__sub">
              Times are computed locally, no tracking.
            </div>
          </div>
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="section__head">
        <div>
          <h2>Today · {loc.city}</h2>
          <p>
            {methodLabel} method · {todayLabel}
          </p>
        </div>
        <Link className="section__link hstack" href="/prayer-times">
          Change city{" "}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
      <div
        className="prayer-card"
        role="group"
        aria-label={`Prayer times for ${loc.city} today`}
      >
        <div>
          <div className="prayer-card__label">Next prayer</div>
          <div className="prayer-card__next">
            {nextInfo ? (
              <>
                <span className="prayer-card__accent">{nextInfo.name}</span> ·{" "}
                {nextInfo.time}
              </>
            ) : (
              <span className="prayer-card__accent">All prayers passed</span>
            )}
          </div>
          <div className="prayer-card__sub">
            {nextInfo ? nextInfo.countdown : "Fajr resumes tomorrow"}
          </div>
        </div>
        <div className="prayer-card__times">
          {PRAYER_LABELS.map((p) => {
            const isActive = upcoming === p.key;
            return (
              <div
                key={p.key}
                className="prayer-card__tile"
                {...(isActive ? { "aria-current": "true" } : {})}
              >
                <div className="prayer-card__tile-name">{p.label}</div>
                <div className="prayer-card__tile-time">
                  {formatLocalTime(times[p.key])}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
