"use client";
// Qibla compass — real-time, like qiblafinder.withgoogle.com.
//
// What "real-time" means here (fixed from the old build):
//   1. Compass ROSE rotates so N points to true north, and a fixed Kaaba
//      marker sits at the correct bearing angle on the rose. When the user
//      rotates the phone, the rose spins with them. Old code rotated only the
//      needle inside a static circle — that's not how a compass works.
//   2. Heading is smoothed with an exponential low-pass filter and animated
//      per frame via requestAnimationFrame — no CSS transition-lag artifacts.
//      Wrap-around at 359°→0° is handled by choosing the shorter arc.
//   3. AR camera mode: live rear-camera background with a floating Qibla
//      arrow that stays locked to true bearing as the phone moves.
//   4. "Aligned" state fires when |heading - bearing| ≤ 5°, with haptic
//      feedback where supported and a visible chip.
//   5. Location is requested on first user gesture; iOS motion permission is
//      requested from the same gesture so we don't get blocked by iOS's
//      "must be a user activation" rule.

import {
  compassLabel,
  distanceToKaabaKm,
  qiblaBearing,
} from "@/lib/qibla";
import {
  CameraIcon,
  CompassIcon,
  Loader2Icon,
  MapPinIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "locating" | "denied" | "ready";
type Mode = "compass" | "ar";

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}
interface DeviceOrientationEventCtor {
  requestPermission?: () => Promise<"granted" | "denied">;
}
declare global {
  interface Window {
    DeviceOrientationEvent: typeof DeviceOrientationEvent &
      DeviceOrientationEventCtor;
  }
}

// Smallest-arc distance between two compass bearings (0..360). Result signed
// so we know which way to interpolate.
function angularDelta(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

// Low-pass smoothing so the compass doesn't jitter with every noisy sample.
// alpha ~ 0.15 gives Google-like smooth follow without feeling laggy.
function smooth(prev: number, next: number, alpha = 0.15): number {
  const d = angularDelta(prev, next);
  return (prev + d * alpha + 360) % 360;
}

export function QiblaCompass() {
  const t = useTranslations("qibla");

  // Location + permissions -----------------------------------------------------
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [motionGranted, setMotionGranted] = useState(false);
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Heading state --------------------------------------------------------------
  // rawHeading = latest device sample; displayHeading = per-frame smoothed
  // value used to render. We keep both so we can compare against target.
  const rawHeadingRef = useRef<number | null>(null);
  const displayHeadingRef = useRef<number>(0);
  const [displayHeading, setDisplayHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // View mode ------------------------------------------------------------------
  const [mode, setMode] = useState<Mode>("compass");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Feature detection ----------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ctor = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & DeviceOrientationEventCtor)
      | undefined;
    setNeedsIOSPermission(typeof ctor?.requestPermission === "function");
  }, []);

  // Location -------------------------------------------------------------------
  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      setError("Geolocation is not supported in this browser.");
      return;
    }
    // Secure-context requirement: mobile browsers silently reject on plain
    // HTTP LAN IPs (localhost is exempt). Detect and give the user an
    // actionable message rather than a stuck "locating…" state.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("denied");
      setError(
        "Location works only over HTTPS on mobile. Open this site over https:// (or via a Cloudflare tunnel) and try again.",
      );
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("ready");
      },
      (err) => {
        setStatus("denied");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Grant it in your browser settings, then reload."
            : "Couldn't read your location. Check that location services are on.",
        );
      },
      { maximumAge: 60_000, timeout: 10_000, enableHighAccuracy: true },
    );
  }, []);

  const requestMotion = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const ctor = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & DeviceOrientationEventCtor)
      | undefined;
    if (ctor?.requestPermission) {
      try {
        const p = await ctor.requestPermission();
        if (p === "granted") {
          setMotionGranted(true);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
    // Non-iOS: no permission gate needed.
    setMotionGranted(true);
    return true;
  }, []);

  // Combined start — one user gesture triggers all permission prompts in the
  // right order (motion first on iOS, then location).
  const start = useCallback(async () => {
    await requestMotion();
    requestLocation();
  }, [requestMotion, requestLocation]);

  // Device-orientation listener ------------------------------------------------
  useEffect(() => {
    if (!motionGranted) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const wk = e as WebkitDeviceOrientationEvent;
      let h: number | null = null;
      if (typeof wk.webkitCompassHeading === "number") {
        // iOS: true-north 0..360, clockwise.
        h = wk.webkitCompassHeading;
        if (typeof wk.webkitCompassAccuracy === "number") {
          setAccuracy(wk.webkitCompassAccuracy);
        }
      } else if (typeof e.alpha === "number") {
        // Others: alpha is 0..360 CCW from north (when e.absolute is true).
        h = (360 - e.alpha) % 360;
        // Rough accuracy proxy — Chrome does not expose real accuracy.
        setAccuracy(e.absolute ? 15 : 45);
      }
      if (h != null && Number.isFinite(h)) {
        rawHeadingRef.current = h;
      }
    };
    window.addEventListener("deviceorientation", onOrient, true);
    return () =>
      window.removeEventListener("deviceorientation", onOrient, true);
  }, [motionGranted]);

  // rAF smoothing loop ---------------------------------------------------------
  useEffect(() => {
    if (!motionGranted) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const raw = rawHeadingRef.current;
      if (raw != null) {
        const next = smooth(displayHeadingRef.current, raw, 0.18);
        displayHeadingRef.current = next;
        setDisplayHeading(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [motionGranted]);

  // Camera stream -------------------------------------------------------------
  useEffect(() => {
    if (mode !== "ar") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setMode("compass");
        setError(
          "Camera unavailable. Grant camera permission or use compass mode.",
        );
      }
    })();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [mode]);

  // Derived --------------------------------------------------------------------
  const bearing = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const dist = coords ? distanceToKaabaKm(coords.lat, coords.lon) : null;
  const heading = displayHeading;
  const hasCompass = heading != null;

  // Angle to rotate the compass rose so North stays fixed to true north.
  const roseRotate = hasCompass ? -heading! : 0;
  // Angle from current heading to the qibla direction (what the user should turn).
  const relativeToQibla =
    hasCompass && bearing != null ? (bearing - heading! + 540) % 360 - 180 : null;
  const aligned =
    relativeToQibla != null && Math.abs(relativeToQibla) <= 5;

  // Haptic pulse when aligned (mobile). Fires once per transition into aligned.
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.([15, 40, 15]);
        } catch {
          /* noop */
        }
      }
    }
    wasAligned.current = aligned;
  }, [aligned]);

  // ---- Render --------------------------------------------------------------
  if (status === "idle") {
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8 text-center">
        <div className="mx-auto max-w-md">
          <CompassIcon
            size={48}
            className="mx-auto text-accent"
            aria-hidden
          />
          <h2 className="mt-4 text-2xl font-bold tracking-title">
            {t("useLocation")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We need your location to compute the great-circle direction to the
            Kaʿbah{needsIOSPermission ? ", and motion permission to spin the compass with your phone" : ""}.
            Nothing leaves your device.
          </p>
          <button
            type="button"
            onClick={start}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-5 h-11 font-medium hover:opacity-90 transition-opacity"
          >
            <MapPinIcon size={16} />
            Start compass
          </button>
        </div>
      </section>
    );
  }

  if (status === "locating") {
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8 text-center">
        <Loader2Icon
          size={32}
          className="mx-auto animate-spin text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm text-muted-foreground">Locating…</p>
      </section>
    );
  }

  if (status === "denied") {
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8">
        <p className="text-sm text-foreground">
          {error ?? "Couldn't read your location."}
        </p>
        <button
          type="button"
          onClick={start}
          className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-separator bg-background px-4 h-10 text-sm hover:bg-muted transition-colors"
        >
          Try again
        </button>
      </section>
    );
  }

  // status === "ready"
  return (
    <section className="space-y-4">
      {/* Mode switcher */}
      <div
        className="inline-flex rounded-full border border-separator bg-surface p-1 text-sm"
        role="tablist"
        aria-label="View mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "compass"}
          onClick={() => setMode("compass")}
          className={`focus-ring rounded-full px-4 h-9 inline-flex items-center gap-1.5 transition-colors ${
            mode === "compass"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CompassIcon size={14} /> Compass
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ar"}
          onClick={() => setMode("ar")}
          className={`focus-ring rounded-full px-4 h-9 inline-flex items-center gap-1.5 transition-colors ${
            mode === "ar"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CameraIcon size={14} /> Camera
        </button>
      </div>

      {mode === "compass" ? (
        <CompassView
          bearing={bearing}
          dist={dist}
          heading={heading}
          roseRotate={roseRotate}
          aligned={aligned}
          hasCompass={hasCompass}
          accuracy={accuracy}
          motionGranted={motionGranted}
          onEnableMotion={requestMotion}
          t={t}
        />
      ) : (
        <ARView
          videoRef={videoRef}
          bearing={bearing}
          heading={heading}
          aligned={aligned}
          relativeToQibla={relativeToQibla}
          onExit={() => setMode("compass")}
        />
      )}
    </section>
  );
}

// ---- Compass view ----------------------------------------------------------

function CompassView({
  bearing,
  dist,
  heading,
  roseRotate,
  aligned,
  hasCompass,
  accuracy,
  motionGranted,
  onEnableMotion,
  t,
}: {
  bearing: number | null;
  dist: number | null;
  heading: number | null;
  roseRotate: number;
  aligned: boolean;
  hasCompass: boolean;
  accuracy: number | null;
  motionGranted: boolean;
  onEnableMotion: () => Promise<boolean>;
  t: ReturnType<typeof useTranslations<"qibla">>;
}) {
  if (bearing == null || dist == null) return null;

  return (
    <div className="rounded-2xl border border-separator bg-surface p-6 sm:p-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        {/* Rose */}
        <div className="mx-auto w-full max-w-[320px]">
          <div className="relative aspect-square">
            <div
              className={`absolute inset-0 rounded-full border transition-colors ${
                aligned ? "border-accent" : "border-separator"
              }`}
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, hsl(var(--surface) / 0.85), hsl(var(--muted) / 0.4))",
                boxShadow:
                  "inset 0 0 0 1px hsl(var(--separator)), inset 0 0 40px hsl(var(--muted) / 0.4), 0 24px 40px -20px rgba(0,0,0,0.25)",
              }}
              aria-hidden
            />
            {/* Rotating rose: cardinal marks + qibla indicator */}
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${roseRotate}deg)`,
                transition: hasCompass ? "none" : "transform 400ms ease-out",
                willChange: "transform",
              }}
              aria-hidden
            >
              {/* Cardinal labels — positioned via absolute inset, counter-rotate via inline-block trick omitted (they should rotate with rose so N follows north) */}
              <div className="absolute inset-0">
                {[
                  { label: "N", deg: 0, primary: true },
                  { label: "E", deg: 90, primary: false },
                  { label: "S", deg: 180, primary: false },
                  { label: "W", deg: 270, primary: false },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="absolute left-1/2 top-0 h-1/2 origin-bottom"
                    style={{
                      transform: `translateX(-50%) rotate(${c.deg}deg)`,
                    }}
                  >
                    <span
                      className={`absolute left-1/2 -translate-x-1/2 top-3 text-sm font-bold tracking-widest ${
                        c.primary
                          ? "text-accent"
                          : "text-muted-foreground"
                      }`}
                      style={{ transform: `translateX(-50%) rotate(${-c.deg - roseRotate}deg)` }}
                    >
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Tick marks every 15° */}
              {Array.from({ length: 24 }).map((_, i) => {
                const deg = i * 15;
                const isCardinal = deg % 90 === 0;
                return (
                  <span
                    key={deg}
                    className="absolute left-1/2 top-0 origin-bottom"
                    style={{
                      transform: `translateX(-50%) rotate(${deg}deg)`,
                      transformOrigin: "50% 50%",
                      height: "50%",
                      width: 2,
                      pointerEvents: "none",
                    }}
                  >
                    <span
                      className={`block ${isCardinal ? "bg-foreground/40" : "bg-muted-foreground/25"}`}
                      style={{
                        width: 2,
                        height: isCardinal ? 12 : 6,
                        borderRadius: 1,
                      }}
                    />
                  </span>
                );
              })}
              {/* Qibla marker — fixed to bearing on the rose */}
              <span
                className="absolute left-1/2 top-0 origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${bearing}deg)`,
                  transformOrigin: "50% 50%",
                  height: "50%",
                  width: 44,
                  pointerEvents: "none",
                }}
              >
                <span
                  className={`absolute left-1/2 -translate-x-1/2 grid place-items-center rounded-lg text-[13px] font-bold shadow-md transition-colors ${
                    aligned
                      ? "bg-accent text-[hsl(var(--accent-foreground))]"
                      : "bg-foreground text-background"
                  }`}
                  style={{
                    top: -6,
                    width: 34,
                    height: 34,
                    border: aligned
                      ? "2px solid hsl(var(--accent))"
                      : "2px solid hsl(var(--background))",
                  }}
                  aria-label="Kaʿbah direction"
                >
                  🕋
                </span>
                {/* Line from centre to marker */}
                <span
                  className={`absolute left-1/2 -translate-x-1/2 rounded-full ${
                    aligned ? "bg-accent" : "bg-foreground/70"
                  }`}
                  style={{ top: 22, width: 2, height: "calc(100% - 22px)" }}
                />
              </span>
            </div>
            {/* Fixed pointer (device facing) at top of dial */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 pointer-events-none"
              aria-hidden
            >
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderBottom: "14px solid hsl(var(--accent))",
                  marginTop: -18,
                }}
              />
            </div>
            {/* Centre puck */}
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-foreground/80 shadow-md" />
            </div>
          </div>

          {/* Alignment chip */}
          <div className="mt-4 flex items-center justify-center">
            {hasCompass ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-xs font-medium transition-colors ${
                  aligned
                    ? "bg-accent text-[hsl(var(--accent-foreground))]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    aligned ? "bg-current" : "bg-current opacity-60"
                  }`}
                />
                {aligned ? "Facing the Qibla" : "Turn to align"}
              </span>
            ) : (
              !motionGranted && (
                <button
                  type="button"
                  onClick={onEnableMotion}
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-separator bg-background px-4 h-9 text-xs hover:bg-muted transition-colors"
                >
                  {t("allowMotion")}
                </button>
              )
            )}
          </div>
        </div>

        {/* Readouts */}
        <div className="grid gap-4">
          <Readout
            label={t("bearing")}
            value={`${Math.round(bearing)}° ${compassLabel(bearing)}`}
            hint="From your location, clockwise from true north"
          />
          <Readout
            label={t("distance")}
            value={`${Math.round(dist).toLocaleString()} ${t("km")}`}
            hint="Great-circle distance to the Kaʿbah"
          />
          {heading != null && (
            <Readout
              label="Device heading"
              value={`${Math.round(heading)}° ${compassLabel(heading)}`}
              hint={
                accuracy != null
                  ? `Compass accuracy ± ${Math.round(accuracy)}°${accuracy > 30 ? " — try a figure-8 motion to calibrate" : ""}`
                  : "Rotate your device to update"
              }
            />
          )}
          {!motionGranted && (
            <p className="text-xs text-muted-foreground">
              {hasCompass
                ? null
                : "The compass hasn't received a heading yet — your device may not have a magnetometer, or motion permission was denied."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Readout({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ---- AR camera view --------------------------------------------------------

function ARView({
  videoRef,
  bearing,
  heading,
  aligned,
  relativeToQibla,
  onExit,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  bearing: number | null;
  heading: number | null;
  aligned: boolean;
  relativeToQibla: number | null;
  onExit: () => void;
}) {
  const hasHeading = heading != null && bearing != null;
  // In AR mode we don't rotate the world — we translate the arrow horizontally
  // to represent how far off to the left/right the qibla is. When |Δ| < 30°
  // we clamp so the arrow stays visible; beyond that we show a "turn arrow".
  const clampDeg = 60;
  const offset =
    relativeToQibla != null
      ? Math.max(-clampDeg, Math.min(clampDeg, relativeToQibla))
      : 0;
  const percent = (offset / clampDeg) * 45; // ±45% horizontal shift
  const beyondFov = relativeToQibla != null && Math.abs(relativeToQibla) > clampDeg;
  const turnDirection = relativeToQibla != null ? (relativeToQibla > 0 ? "right" : "left") : null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-separator bg-black aspect-[3/4] sm:aspect-video">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        autoPlay
        muted
      />
      <div className="absolute inset-0 pointer-events-none">
        {/* Centre reticle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 border-white/40" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-16 bg-white/40" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-0.5 bg-white/40" />

        {/* Qibla arrow */}
        {hasHeading && !beyondFov && (
          <div
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(calc(-50% + ${percent}%), -50%)`,
              transition: "transform 60ms linear",
            }}
          >
            <div
              className={`grid place-items-center rounded-2xl px-4 py-3 shadow-2xl ${
                aligned
                  ? "bg-accent text-[hsl(var(--accent-foreground))]"
                  : "bg-white/95 text-black"
              }`}
            >
              <div className="text-3xl leading-none">🕋</div>
              <div className="mt-1 text-[10px] font-bold tracking-widest uppercase">
                Qibla
              </div>
            </div>
          </div>
        )}

        {/* Beyond-FOV instruction */}
        {hasHeading && beyondFov && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              turnDirection === "left" ? "left-4" : "right-4"
            } bg-white/95 text-black rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-2`}
          >
            <span className="text-2xl leading-none">
              {turnDirection === "left" ? "←" : "→"}
            </span>
            <span className="text-sm font-semibold">
              Turn {turnDirection}
            </span>
          </div>
        )}

        {/* Aligned banner */}
        {aligned && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent text-[hsl(var(--accent-foreground))] rounded-full px-4 h-9 inline-flex items-center gap-2 text-sm font-semibold shadow-lg pointer-events-none">
            <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
            Facing the Qibla
          </div>
        )}

        {/* Bearing readout */}
        {bearing != null && (
          <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur text-white text-xs rounded-lg px-3 py-1.5 font-medium tabular-nums">
            Qibla {Math.round(bearing)}° {compassLabel(bearing)}
            {heading != null && (
              <span className="ml-2 opacity-70">
                · you {Math.round(heading)}°
              </span>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onExit}
        className="focus-ring absolute top-4 right-4 grid place-items-center w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors"
        aria-label="Exit camera view"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}
