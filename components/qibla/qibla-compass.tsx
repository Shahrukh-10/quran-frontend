"use client";
// Qibla compass — reads device orientation where available, falls back to
// static bearing (degrees + cardinal). Works on iOS after motion permission is granted.

import { compassLabel, distanceToKaabaKm, qiblaBearing } from "@/lib/qibla";
import { Loader2Icon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Status = "idle" | "locating" | "denied" | "ready";

// Safari iOS extends DeviceOrientationEvent with a permission request and a
// webkitCompassHeading (true-north 0..360). Model those directly instead of casting.
interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
interface DeviceOrientationEventCtor {
  requestPermission?: () => Promise<"granted" | "denied">;
}
declare global {
  interface Window {
    DeviceOrientationEvent: typeof DeviceOrientationEvent & DeviceOrientationEventCtor;
  }
}

export function QiblaCompass() {
  const t = useTranslations("qibla");
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [motionGranted, setMotionGranted] = useState<boolean>(false);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
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

  const enableMotion = useCallback(async () => {
    const ctor = typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined;
    if (ctor?.requestPermission) {
      try {
        const p = await ctor.requestPermission();
        if (p === "granted") setMotionGranted(true);
      } catch {
        /* denied */
      }
    } else {
      // Non-iOS: no permission gate needed.
      setMotionGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!motionGranted) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      // iOS Safari extends the event with a true-north compass heading (0..360).
      const wk = (e as WebkitDeviceOrientationEvent).webkitCompassHeading;
      if (typeof wk === "number") {
        setHeading(wk);
      } else if (typeof e.alpha === "number") {
        // Others: alpha is 0..360 counter-clockwise from north.
        setHeading((360 - e.alpha) % 360);
      }
    };
    window.addEventListener("deviceorientation", onOrient, true);
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, [motionGranted]);

  const bearing = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const dist = coords ? distanceToKaabaKm(coords.lat, coords.lon) : null;
  const rotate = heading != null && bearing != null ? (bearing - heading + 360) % 360 : bearing;

  return (
    <section className="rounded-2xl border border-separator bg-surface p-6">
      {status === "idle" && (
        <button
          type="button"
          onClick={request}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-4 h-11 font-medium transition-colors duration-micro ease-spring hover:opacity-90"
        >
          <MapPinIcon size={16} />
          {t("useLocation")}
        </button>
      )}
      {status === "locating" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon size={16} className="animate-spin" />
          {t("useLocation")}…
        </p>
      )}
      {status === "denied" && (
        <p className="text-sm text-muted-foreground">{t("compassUnavailable")}</p>
      )}
      {status === "ready" && bearing != null && dist != null && (
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="relative mx-auto aspect-square w-56 rounded-full border border-separator bg-background grid place-items-center">
            <div
              className="absolute inset-0 grid place-items-center transition-transform duration-component ease-spring"
              style={{ transform: `rotate(${rotate}deg)` }}
              aria-hidden
            >
              <div className="w-1.5 h-24 -mt-16 bg-accent rounded-full" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-accent">
                Qibla
              </div>
            </div>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-foreground/80" />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t("bearing")}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {Math.round(bearing)}° {compassLabel(bearing)}
            </p>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              {t("distance")}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {Math.round(dist).toLocaleString()} {t("km")}
            </p>
            {!motionGranted && (
              <button
                type="button"
                onClick={enableMotion}
                className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg border border-separator bg-background px-4 h-11 text-sm hover:bg-muted transition-colors duration-micro ease-spring"
              >
                {t("allowMotion")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
