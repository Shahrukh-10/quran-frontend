"use client";

// Client component: needs state (city selection, method), effects (clock tick,
// localStorage hydration), and browser APIs (Geolocation). No new CSS files —
// styling relies on the Tailwind token palette defined in tailwind.config.ts +
// app/globals.css.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { CITIES, type City } from "@/lib/cities";
import { computePrayerTimes, METHODS, type MethodId } from "@/lib/prayer-times";
import { gregorianToHijri, HIJRI_MONTHS } from "@/lib/hijri";
import { getStore, updateSettings } from "@/lib/storage";

type PrayerRow = { key: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha"; label: string; time: Date };

const METHOD_IDS: readonly MethodId[] = METHODS.map((m) => m.id);
const CITY_SLUG_KEY = "iw.v1.cityLastSlug";

function isMethodId(v: string): v is MethodId {
  return (METHOD_IDS as readonly string[]).includes(v);
}

function findCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

function readSavedCitySlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CITY_SLUG_KEY);
  } catch {
    return null;
  }
}

function writeSavedCitySlug(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CITY_SLUG_KEY, slug);
  } catch {
    /* quota / private mode — swallow, matches lib/storage.ts convention */
  }
}

export function PrayerHero() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<City | undefined>(undefined);
  const [method, setMethod] = useState<MethodId>("Karachi");
  const [madhab, setMadhab] = useState<"shafi" | "hanafi">("shafi");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mount + hydrate from localStorage.
  useEffect(() => {
    setMounted(true);
    const settings = getStore().settings;
    if (isMethodId(settings.calcMethod)) setMethod(settings.calcMethod);
    setMadhab(settings.madhab);
    const savedSlug = readSavedCitySlug();
    const initial = savedSlug ? findCityBySlug(savedSlug) : undefined;
    // Default to first city (London) if nothing saved. CITIES has entries so
    // this is safe, but noUncheckedIndexedAccess still forces us to guard.
    setSelectedCity(initial ?? CITIES[0]);
  }, []);

  // Clock tick — only after mount so SSR/CSR markup matches.
  useEffect(() => {
    if (!mounted) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [mounted]);

  const prayers = useMemo<PrayerRow[]>(() => {
    if (!selectedCity) return [];
    try {
      const times = computePrayerTimes({
        lat: selectedCity.lat,
        lon: selectedCity.lon,
        date: now,
        method,
        madhab,
      });
      return [
        { key: "fajr", label: "Fajr", time: times.fajr },
        { key: "sunrise", label: "Sunrise", time: times.sunrise },
        { key: "dhuhr", label: "Dhuhr", time: times.dhuhr },
        { key: "asr", label: "Asr", time: times.asr },
        { key: "maghrib", label: "Maghrib", time: times.maghrib },
        { key: "isha", label: "Isha", time: times.isha },
      ];
    } catch (err) {
      console.error("prayer-times failed:", err);
      return [];
    }
  }, [selectedCity, now, method, madhab]);

  // Active = most recent prayer whose time has already passed today.
  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < prayers.length; i++) {
      const p = prayers[i];
      if (p && p.time.getTime() <= now.getTime()) idx = i;
    }
    return idx;
  }, [prayers, now]);

  const suggestions = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return [];
    return CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [cityQuery]);

  const pickCity = (c: City) => {
    setSelectedCity(c);
    setCityQuery("");
    setShowSuggestions(false);
    writeSavedCitySlug(c.slug);
  };

  const useNearby = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Nearest-city fallback — good enough for a curated seed list. Full
        // reverse-geocode isn't needed for a homepage hero.
        let best: City | undefined = CITIES[0];
        let bestDist = Number.POSITIVE_INFINITY;
        for (const c of CITIES) {
          const dLat = c.lat - pos.coords.latitude;
          const dLon = c.lon - pos.coords.longitude;
          const d = Math.hypot(dLat, dLon);
          if (d < bestDist) {
            best = c;
            bestDist = d;
          }
        }
        if (best) pickCity(best);
      },
      () => {
        /* denied / unavailable — silent, user can still search */
      },
      { timeout: 5000, maximumAge: 60_000 },
    );
  };

  const onMethodChange = (raw: string) => {
    if (!isMethodId(raw)) return;
    setMethod(raw);
    try {
      updateSettings({ calcMethod: raw });
    } catch {
      /* localStorage disabled — non-fatal */
    }
  };

  // Sun/moon position (visual only — not astronomical).
  const hoursNow = now.getHours() + now.getMinutes() / 60;
  const isDay = hoursNow >= 6 && hoursNow <= 18;
  const sunProgress = isDay ? (hoursNow - 6) / 12 : 0;
  const moonProgress = !isDay ? (hoursNow < 6 ? (hoursNow + 6) / 12 : (hoursNow - 18) / 12) : 0;

  // Time-dependent strings are only meaningful once mounted (client clock).
  // Rendering placeholders keeps SSR/CSR markup structurally identical and
  // avoids a hydration mismatch on the clock/Hijri text.
  const hijri = mounted ? gregorianToHijri(now) : null;
  const hijriMonth = hijri ? (HIJRI_MONTHS[hijri.hm - 1] ?? `Month ${hijri.hm}`) : "";
  const dateStr = mounted
    ? now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";
  const timeStr = mounted
    ? now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

  // Cloud drift depends on the clock, so it only animates post-mount.
  const s = now.getSeconds();
  const cloud1X = 200 + ((s % 60) / 60) * 200;
  const cloud2X = 800 + (((s + 20) % 60) / 60) * 180;
  const cloud3X = 1500 - (((s + 40) % 60) / 60) * 160;

  return (
    <section
      aria-label="Prayer times"
      className="relative overflow-hidden rounded-3xl border border-separator bg-gradient-to-b from-sky-100 via-blue-50 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6 md:p-10"
    >
      {/* Animated sky — gated on mount because it derives from the client
          clock; SSR renders a static sky-gradient only. */}
      {mounted && (
        <svg
          viewBox="0 0 1920 400"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
          focusable="false"
        >
        {/* Stars (night only) */}
        {!isDay && (
          <g opacity="0.6">
            <circle cx="200" cy="60" r="1.5" fill="white" />
            <circle cx="450" cy="120" r="1" fill="white" />
            <circle cx="720" cy="40" r="1.2" fill="white" />
            <circle cx="1050" cy="90" r="1" fill="white" />
            <circle cx="1300" cy="60" r="1.5" fill="white" />
            <circle cx="1600" cy="130" r="1" fill="white" />
            <circle cx="1800" cy="50" r="1.2" fill="white" />
          </g>
        )}
        {/* Clouds */}
        <g opacity={isDay ? 0.7 : 0.3}>
          <ellipse cx={cloud1X} cy="80" rx="120" ry="20" fill="white" opacity="0.55" />
          <ellipse cx={cloud2X} cy="120" rx="90" ry="18" fill="white" opacity="0.45" />
          <ellipse cx={cloud3X} cy="60" rx="110" ry="16" fill="white" opacity="0.5" />
        </g>
        {/* Sun arc */}
        {isDay && (
          <g>
            <path
              d="M 80 380 Q 960 30 1840 380"
              fill="none"
              stroke="rgba(255,220,150,0.3)"
              strokeWidth="3"
              strokeDasharray="6 8"
            />
            <circle
              cx={80 + sunProgress * 1760}
              cy={380 - Math.sin(sunProgress * Math.PI) * 350}
              r="70"
              fill="#ffd54f"
              opacity="0.28"
            />
            <circle
              cx={80 + sunProgress * 1760}
              cy={380 - Math.sin(sunProgress * Math.PI) * 350}
              r="38"
              fill="#ffd54f"
            />
          </g>
        )}
        {/* Moon arc */}
        {!isDay && (
          <g>
            <path
              d="M 80 380 Q 960 30 1840 380"
              fill="none"
              stroke="rgba(200,200,220,0.15)"
              strokeWidth="3"
              strokeDasharray="6 8"
            />
            <circle
              cx={80 + moonProgress * 1760}
              cy={380 - Math.sin(moonProgress * Math.PI) * 350}
              r="55"
              fill="rgba(220,220,235,0.25)"
            />
            <circle
              cx={80 + moonProgress * 1760}
              cy={380 - Math.sin(moonProgress * Math.PI) * 350}
              r="30"
              fill="rgba(230,230,245,0.95)"
            />
          </g>
        )}
      </svg>
      )}

      {/* Foreground */}
      <div className="relative">
        {/* City search + Nearby */}
        <div className="relative max-w-xl mx-auto">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="search"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Small delay so a click on a suggestion registers before we hide the list.
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="Search for a city"
                aria-label="Search for a city"
                autoComplete="off"
                className="focus-ring w-full rounded-lg border border-separator bg-background/80 backdrop-blur px-4 h-11 text-sm"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-12 z-20 rounded-lg border border-separator bg-surface shadow-lg max-h-64 overflow-y-auto"
                >
                  {suggestions.map((c) => (
                    <li key={c.slug} role="option" aria-selected="false">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickCity(c)}
                        className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                      >
                        {c.name},{" "}
                        <span className="text-muted-foreground">{c.country}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={useNearby}
              className="focus-ring rounded-lg border border-separator bg-background/80 backdrop-blur px-4 h-11 text-sm font-medium hover:bg-muted"
            >
              Nearby
            </button>
          </div>
        </div>

        {/* Date + clock + hijri — gated on mount to keep SSR/CSR markup
            aligned. Pre-mount we render a minimal placeholder so layout
            doesn't jump. */}
        {mounted && hijri ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">{dateStr}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hijriMonth} {hijri.hd}, {hijri.hy} AH
            </p>
            <p className="mt-4 text-5xl md:text-6xl font-bold tracking-tight tabular-nums">
              {timeStr}
            </p>
          </div>
        ) : (
          <div className="mt-8 text-center min-h-[7rem]" aria-hidden="true" />
        )}

        {/* City + method */}
        {selectedCity && (
          <div className="mt-6 text-center">
            <p className="text-sm font-medium">
              Prayer times for {selectedCity.name}, {selectedCity.country}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <label className="sr-only" htmlFor="prayer-hero-method">
                Calculation method
              </label>
              <select
                id="prayer-hero-method"
                value={method}
                onChange={(e) => onMethodChange(e.target.value)}
                className="focus-ring text-xs bg-background/80 backdrop-blur rounded border border-separator px-2 py-1"
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Prayer cards */}
        {prayers.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {prayers.map((p, i) => {
              const active = i === activeIdx;
              return (
                <div
                  key={p.key}
                  aria-current={active ? "true" : undefined}
                  className={
                    active
                      ? "rounded-xl border p-4 text-center backdrop-blur border-accent bg-accent/10 ring-2 ring-accent/40"
                      : "rounded-xl border p-4 text-center backdrop-blur border-separator bg-background/60"
                  }
                >
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {p.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {p.time.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Read Quran CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/quran"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-8 h-12 text-base font-semibold text-[hsl(var(--accent-foreground))] hover:bg-accent/90 shadow-lg"
          >
            Read Quran
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            Or{" "}
            <Link href="/quran/read" className="text-accent hover:underline">
              read as PDF (Indopak)
            </Link>{" "}
            ·{" "}
            <Link href="/quran/browse" className="text-accent hover:underline">
              browse by juz / hizb
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
