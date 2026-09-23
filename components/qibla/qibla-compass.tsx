"use client";
// Qibla compass — full-screen AR-first, magnetic-declination-corrected.
//
// KEY CORRECTNESS FIXES vs previous version (2026-09-23):
//
// 1. MAGNETIC DECLINATION CORRECTION (the "direction was fully wrong" bug)
//    Android's `DeviceOrientationEvent.alpha` reports MAGNETIC north on
//    most devices, not true north. The previous code treated it as true
//    north, so in regions with significant declination (New York -13°,
//    UK +1°, Sydney +13°) the Qibla arrow was off by exactly that amount.
//    We now compute WMM-based declination at the user's geolocation and
//    add it to alpha. iOS `webkitCompassHeading` is already true-north-
//    referenced — we do NOT double-correct.
//
// 2. FULL-SCREEN CAMERA-FIRST UX
//    The camera is the default view (not a "tab you have to switch to").
//    It fills the viewport, shows a persistent Qibla-line marker, and has
//    dedicated left/right turn indicators along both edges. Tapping
//    "Compass" collapses to a classic rose view inside the same overlay.
//
// 3. SINGLE-GESTURE PERMISSIONS
//    One "Start Qibla finder" button triggers, in this order:
//    motion permission (iOS DeviceOrientationEvent.requestPermission —
//    must be first, must be sync with the tap) → camera getUserMedia →
//    geolocation. Any await between them would strip iOS user-activation
//    and permissions would silently fail.
//
// 4. LINE TO QIBLA WHEN ALIGNED
//    A vertical accent-color line snaps into place when |heading -
//    bearing| ≤ 5°, with haptic + visible pulse on the transition into
//    aligned. Not "toy compass" alignment — the user sees a clear
//    visual "you are pointed at the Kaʿbah" signal.
//
// 5. FLUID rAF SMOOTHING
//    Shortest-arc + exponential low-pass at alpha=0.18, driven by
//    requestAnimationFrame — not by the raw sensor event. Wrap-around
//    at 359°→0° goes the short way. No CSS transitions fighting the
//    inline transform during live updates.

import {
  compassLabel,
  distanceToKaabaKm,
  magneticDeclination,
  qiblaBearing,
} from "@/lib/qibla";
import {
  CompassIcon,
  Loader2Icon,
  MapPinIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "starting" | "ready" | "denied";
type Mode = "camera" | "compass";

interface WebkitDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}
interface DeviceOrientationEventCtor {
  requestPermission?: () => Promise<"granted" | "denied">;
}
declare global {
  interface Window {
    DeviceOrientationEvent: typeof DeviceOrientationEvent & DeviceOrientationEventCtor;
  }
}

// Smallest signed arc from a to b, both in [0, 360). Result in [-180, 180].
function angularDelta(a: number, b: number): number {
  let d = ((b - a + 540) % 360) - 180;
  if (d === -180) d = 180;
  return d;
}

// Exponential low-pass. alpha ≈ 0.18 gives Google-Qibla-Finder-like smooth
// follow without visible lag on real magnetometer noise.
function smooth(prev: number, next: number, alpha = 0.18): number {
  const d = angularDelta(prev, next);
  return (prev + d * alpha + 360) % 360;
}

export function QiblaCompass() {
  const t = useTranslations("qibla");

  // Feature detection at mount — needed to know whether we must show the
  // "Grant motion" iOS prompt or if we can go straight to sensor listening.
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ctor = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & DeviceOrientationEventCtor)
      | undefined;
    setNeedsIOSPermission(typeof ctor?.requestPermission === "function");
  }, []);

  // Permissions + location ----------------------------------------------------
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [motionGranted, setMotionGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Heading state -------------------------------------------------------------
  // rawHeadingRef = latest magnetometer sample (already true-north-corrected
  //                 for the platform when it enters here).
  // displayHeadingRef = per-frame smoothed value used to render (kept in a
  //                     ref so the rAF loop doesn't re-subscribe on setState).
  const rawHeadingRef = useRef<number | null>(null);
  const displayHeadingRef = useRef<number>(0);
  const [displayHeading, setDisplayHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const declinationRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // View mode -----------------------------------------------------------------
  const [mode, setMode] = useState<Mode>("camera");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ---- Permission steps (each returns a boolean so `start` can chain) -----

  const requestMotion = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const ctor = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & DeviceOrientationEventCtor)
      | undefined;
    if (ctor?.requestPermission) {
      try {
        const p = await ctor.requestPermission();
        const ok = p === "granted";
        setMotionGranted(ok);
        return ok;
      } catch {
        return false;
      }
    }
    // Non-iOS: no permission gate needed.
    setMotionGranted(true);
    return true;
  }, []);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraGranted(true);
      return true;
    } catch {
      // Camera denied is not fatal — we fall back to compass mode.
      setCameraGranted(false);
      setMode("compass");
      return false;
    }
  }, []);

  const requestLocation = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("Geolocation is not supported in this browser.");
        resolve(false);
        return;
      }
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setError(
          "Location works only over HTTPS. Open this site over https:// and try again.",
        );
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          try {
            declinationRef.current = magneticDeclination(pos.coords.latitude, pos.coords.longitude);
          } catch {
            declinationRef.current = 0;
          }
          resolve(true);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setError("Location permission was denied. Enable it in your browser settings, then reload.");
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setError("Your device couldn't get a position. Move near a window and try again.");
          } else if (err.code === err.TIMEOUT) {
            setError("Location request timed out. Try again.");
          } else {
            setError("Couldn't read your location.");
          }
          resolve(false);
        },
        { maximumAge: 60_000, timeout: 15_000, enableHighAccuracy: true },
      );
    });
  }, []);

  // Combined start — one user gesture triggers all permission prompts.
  // Order matters (iOS user-activation dies after any await if motion isn't
  // first). Motion is synchronous-ish (returns a Promise resolved by the
  // same click's activation); camera and location can follow.
  const start = useCallback(async () => {
    setStatus("starting");
    setError(null);
    await requestMotion();
    await requestCamera();
    const gotLocation = await requestLocation();
    setStatus(gotLocation ? "ready" : "denied");
  }, [requestMotion, requestCamera, requestLocation]);

  // Auto-attempt start on first mount for browsers where no permission is
  // needed (desktop Chrome without motion; permissions already granted from
  // a prior session). iOS Safari WILL always need the manual tap because
  // requestPermission requires user activation — the "Start" button below
  // handles that path.
  //
  // We only auto-start when there's genuinely no gate: no iOS motion prompt
  // required. If any prompt IS required, we render the tap-to-start UI so
  // the user's tap becomes the activation for all three requests.
  useEffect(() => {
    if (needsIOSPermission) return; // must be user-initiated
    if (status !== "idle") return;
    // Give the effect one frame so we don't race the feature-detection
    // effect above.
    const id = setTimeout(() => {
      start();
    }, 50);
    return () => clearTimeout(id);
  }, [needsIOSPermission, status, start]);

  // Device-orientation listener ----------------------------------------------
  useEffect(() => {
    if (!motionGranted) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const wk = e as WebkitDeviceOrientationEvent;
      let h: number | null = null;
      let alreadyTrueNorth = false;
      if (typeof wk.webkitCompassHeading === "number") {
        // iOS Safari — already true-north-corrected. Do NOT add declination.
        h = wk.webkitCompassHeading;
        alreadyTrueNorth = true;
        if (typeof wk.webkitCompassAccuracy === "number") {
          setAccuracy(wk.webkitCompassAccuracy);
        }
      } else if (typeof e.alpha === "number") {
        // Chrome / Android / others: alpha is 0..360 CCW from MAGNETIC north
        // when the device is flat. Convert to CW-from-magnetic-north first,
        // then correct to true north with the WMM declination.
        h = (360 - e.alpha) % 360;
        alreadyTrueNorth = false;
        setAccuracy(e.absolute ? 15 : 45);
      }
      if (h == null || !Number.isFinite(h)) return;
      if (!alreadyTrueNorth) {
        // True heading = magnetic heading + declination. `declinationRef` is
        // 0 until geolocation resolves — an early sample can be up to a few
        // seconds ahead of the fix on some devices, but declination is a
        // ± 20° correction at most and dominated by the smoothing loop.
        h = ((h + declinationRef.current) % 360 + 360) % 360;
      }
      rawHeadingRef.current = h;
    };
    window.addEventListener("deviceorientation", onOrient, true);
    // Some Android browsers only fire the absolute variant.
    window.addEventListener("deviceorientationabsolute" as "deviceorientation", onOrient, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("deviceorientationabsolute" as "deviceorientation", onOrient, true);
    };
  }, [motionGranted]);

  // rAF smoothing loop -------------------------------------------------------
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

  // Camera cleanup on unmount + mode change to compass -----------------------
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // If user switches to compass mode, stop the camera to save battery.
  useEffect(() => {
    if (mode !== "compass") return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraGranted(false);
  }, [mode]);

  // Re-request camera when returning to camera mode after collapsing.
  const reopenCamera = useCallback(async () => {
    if (streamRef.current) return;
    await requestCamera();
  }, [requestCamera]);
  useEffect(() => {
    if (mode !== "camera") return;
    if (status !== "ready") return;
    if (!cameraGranted) reopenCamera();
  }, [mode, status, cameraGranted, reopenCamera]);

  // Derived values -----------------------------------------------------------
  const bearing = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const dist = coords ? distanceToKaabaKm(coords.lat, coords.lon) : null;
  const heading = displayHeading;
  const hasCompass = heading != null;

  const roseRotate = hasCompass ? -heading! : 0;
  const relativeToQibla =
    hasCompass && bearing != null ? (bearing - heading! + 540) % 360 - 180 : null;
  const aligned = relativeToQibla != null && Math.abs(relativeToQibla) <= 5;

  // Haptic pulse once per transition into aligned.
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

  // -------- Render: idle / starting / denied gates --------------------------

  if (status === "idle") {
    // On iOS this is the required tap-to-grant screen. On other platforms
    // we auto-start (see the effect above), so this branch is only briefly
    // visible before "starting" or "ready".
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8 text-center">
        <div className="mx-auto max-w-md">
          <CompassIcon size={48} className="mx-auto text-accent" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold tracking-title">
            {t("useLocation")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We'll ask for {needsIOSPermission ? "motion, camera, and location" : "camera and location"} permission. Nothing leaves your device.
          </p>
          <button
            type="button"
            onClick={start}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg bg-accent text-[hsl(var(--accent-foreground))] px-5 h-11 font-medium hover:opacity-90 transition-opacity"
          >
            <MapPinIcon size={16} />
            Start Qibla finder
          </button>
        </div>
      </section>
    );
  }

  if (status === "starting") {
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8 text-center">
        <Loader2Icon size={32} className="mx-auto animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">Getting your location…</p>
      </section>
    );
  }

  if (status === "denied") {
    return (
      <section className="rounded-2xl border border-separator bg-surface p-8">
        <p className="text-sm text-foreground">
          {error ?? "Couldn't get your location or motion access."}
        </p>
        <button
          type="button"
          onClick={start}
          className="focus-ring mt-4 inline-flex items-center gap-2 rounded-lg border border-separator bg-background px-4 h-10 text-sm hover:bg-muted transition-colors"
        >
          <RefreshCwIcon size={14} />
          Try again
        </button>
      </section>
    );
  }

  // status === "ready" — main UI ---------------------------------------------
  return (
    <section className="qibla-finder">
      {mode === "camera" ? (
        <CameraView
          videoRef={videoRef}
          bearing={bearing}
          heading={heading}
          dist={dist}
          aligned={aligned}
          relativeToQibla={relativeToQibla}
          onSwitchToCompass={() => setMode("compass")}
          declination={declinationRef.current}
          cameraGranted={cameraGranted}
          onRequestCamera={reopenCamera}
        />
      ) : (
        <CompassView
          bearing={bearing}
          dist={dist}
          heading={heading}
          roseRotate={roseRotate}
          aligned={aligned}
          hasCompass={hasCompass}
          accuracy={accuracy}
          onSwitchToCamera={() => setMode("camera")}
          declination={declinationRef.current}
          t={t}
        />
      )}
    </section>
  );
}

// ============================================================================
// Camera-first AR view — full-screen fixed overlay
// ============================================================================

function CameraView({
  videoRef,
  bearing,
  heading,
  dist,
  aligned,
  relativeToQibla,
  onSwitchToCompass,
  declination,
  cameraGranted,
  onRequestCamera,
}: {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  bearing: number | null;
  heading: number | null;
  dist: number | null;
  aligned: boolean;
  relativeToQibla: number | null;
  onSwitchToCompass: () => void;
  declination: number;
  cameraGranted: boolean;
  onRequestCamera: () => void;
}) {
  const hasHeading = heading != null && bearing != null;

  // Horizontal-shift model: the phone's camera FOV on a typical smartphone
  // is about 65-75° horizontal. We map the signed angular delta through a
  // ±32° window (a little narrower than the real FOV so the arrow stays
  // clearly inside the frame when close to aligned) into a percentage
  // shift of the viewport width.
  const fovHalf = 32;
  const clamped =
    relativeToQibla != null
      ? Math.max(-fovHalf, Math.min(fovHalf, relativeToQibla))
      : 0;
  const percent = (clamped / fovHalf) * 42; // ± 42% of viewport width
  const beyondFov = relativeToQibla != null && Math.abs(relativeToQibla) > fovHalf;
  const turnDirection = relativeToQibla != null ? (relativeToQibla > 0 ? "right" : "left") : null;

  return (
    <div className="qibla-fullscreen">
      {/* Live camera background */}
      <video
        ref={videoRef}
        className="qibla-video"
        playsInline
        autoPlay
        muted
      />

      {/* Dim overlay to boost UI contrast */}
      <div className="qibla-dim" aria-hidden />

      {/* Camera-denied fallback prompt */}
      {!cameraGranted && (
        <div className="qibla-camera-blocked">
          <p>Camera access is needed for AR mode.</p>
          <button
            type="button"
            onClick={onRequestCamera}
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg bg-white/95 text-black px-4 h-10 text-sm font-medium"
          >
            Enable camera
          </button>
          <button
            type="button"
            onClick={onSwitchToCompass}
            className="focus-ring mt-2 text-white/80 text-sm underline"
          >
            Use compass instead
          </button>
        </div>
      )}

      {/* Left-edge "turn left" indicator */}
      {hasHeading && beyondFov && turnDirection === "left" && (
        <div className="qibla-turn qibla-turn--left" aria-hidden>
          <div className="qibla-turn__arrow">‹</div>
          <div className="qibla-turn__label">Turn LEFT</div>
        </div>
      )}
      {/* Right-edge "turn right" indicator */}
      {hasHeading && beyondFov && turnDirection === "right" && (
        <div className="qibla-turn qibla-turn--right" aria-hidden>
          <div className="qibla-turn__arrow">›</div>
          <div className="qibla-turn__label">Turn RIGHT</div>
        </div>
      )}

      {/* Center crosshair (always visible) */}
      <div className="qibla-crosshair" aria-hidden>
        <div className="qibla-crosshair__ring" />
      </div>

      {/* Qibla line + Kaʿbah marker — only within FOV */}
      {hasHeading && !beyondFov && (
        <div
          className={`qibla-arrow ${aligned ? "qibla-arrow--aligned" : ""}`}
          style={{
            transform: `translate(calc(-50% + ${percent}vw), 0)`,
            // Longer transition when snapping (aligned), fast otherwise.
            transition: aligned
              ? "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)"
              : "transform 60ms linear",
          }}
        >
          {/* Vertical line from top to bottom of viewport */}
          <div className="qibla-arrow__line" />
          {/* Kaʿbah tile at center */}
          <div className="qibla-arrow__marker">
            <div className="qibla-arrow__kaaba">🕋</div>
            <div className="qibla-arrow__label">
              {aligned ? "Facing the Qibla" : "Qibla"}
            </div>
          </div>
        </div>
      )}

      {/* Aligned banner (top) */}
      {aligned && (
        <div className="qibla-aligned-banner">
          <span className="qibla-aligned-banner__dot" />
          Facing the Qibla · {bearing != null ? `${Math.round(bearing)}°` : ""}
        </div>
      )}

      {/* Bottom readouts card */}
      <div className="qibla-readout">
        <div className="qibla-readout__row">
          <div>
            <div className="qibla-readout__label">Qibla bearing</div>
            <div className="qibla-readout__value">
              {bearing != null ? `${Math.round(bearing)}° ${compassLabel(bearing)}` : "—"}
            </div>
          </div>
          <div>
            <div className="qibla-readout__label">Distance</div>
            <div className="qibla-readout__value">
              {dist != null ? `${Math.round(dist).toLocaleString()} km` : "—"}
            </div>
          </div>
          {heading != null && (
            <div>
              <div className="qibla-readout__label">You facing</div>
              <div className="qibla-readout__value">
                {`${Math.round(heading)}° ${compassLabel(heading)}`}
              </div>
            </div>
          )}
        </div>
        {Math.abs(declination) > 0.1 && (
          <div className="qibla-readout__hint">
            Magnetic declination corrected · {declination >= 0 ? "+" : ""}
            {declination.toFixed(1)}°
          </div>
        )}
      </div>

      {/* Mode switcher (top-right) */}
      <div className="qibla-mode-switch-group">
        <button
          type="button"
          onClick={onSwitchToCompass}
          className="qibla-mode-switch"
          aria-label="Switch to compass view"
        >
          <CompassIcon size={16} />
          <span>Compass</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Compass rose view — fallback when camera unavailable
// ============================================================================

function CompassView({
  bearing,
  dist,
  heading,
  roseRotate,
  aligned,
  hasCompass,
  accuracy,
  onSwitchToCamera,
  declination,
  t: _t,
}: {
  bearing: number | null;
  dist: number | null;
  heading: number | null;
  roseRotate: number;
  aligned: boolean;
  hasCompass: boolean;
  accuracy: number | null;
  onSwitchToCamera: () => void;
  declination: number;
  t: ReturnType<typeof useTranslations<"qibla">>;
}) {
  if (bearing == null || dist == null) return null;

  return (
    <div className="rounded-2xl border border-separator bg-surface p-6 sm:p-8">
      <div className="flex justify-end mb-3">
        <button
          type="button"
          onClick={onSwitchToCamera}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-separator bg-background px-3 h-8 text-xs font-medium hover:bg-muted transition-colors"
        >
          Open camera
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        {/* Rose */}
        <div className="mx-auto w-full max-w-[320px]">
          <div className="relative aspect-square">
            {/* Dial background */}
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
            {/* Rotating rose */}
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${roseRotate}deg)`,
                transition: hasCompass ? "none" : "transform 400ms ease-out",
                willChange: "transform",
              }}
              aria-hidden
            >
              {/* Cardinals */}
              {[
                { label: "N", deg: 0, primary: true },
                { label: "E", deg: 90, primary: false },
                { label: "S", deg: 180, primary: false },
                { label: "W", deg: 270, primary: false },
              ].map((c) => (
                <div
                  key={c.label}
                  className="absolute left-1/2 top-0 h-1/2 origin-bottom"
                  style={{ transform: `translateX(-50%) rotate(${c.deg}deg)` }}
                >
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 top-3 text-sm font-bold tracking-widest ${
                      c.primary ? "text-accent" : "text-muted-foreground"
                    }`}
                    style={{
                      transform: `translateX(-50%) rotate(${-c.deg - roseRotate}deg)`,
                    }}
                  >
                    {c.label}
                  </span>
                </div>
              ))}
              {/* Tick marks */}
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
                <span
                  className={`absolute left-1/2 -translate-x-1/2 rounded-full ${
                    aligned ? "bg-accent" : "bg-foreground/70"
                  }`}
                  style={{ top: 22, width: 2, height: "calc(100% - 22px)" }}
                />
              </span>
            </div>
            {/* Fixed device-facing pointer */}
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
            {hasCompass && (
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
            )}
          </div>
        </div>

        {/* Readouts */}
        <div className="grid gap-4">
          <Readout
            label="Qibla bearing"
            value={`${Math.round(bearing)}° ${compassLabel(bearing)}`}
            hint="From your location, clockwise from true north"
          />
          <Readout
            label="Distance"
            value={`${Math.round(dist).toLocaleString()} km`}
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
          {Math.abs(declination) > 0.1 && (
            <p className="text-xs text-muted-foreground">
              Magnetic declination corrected: {declination >= 0 ? "+" : ""}
              {declination.toFixed(1)}° at your location.
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
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

// Marker export kept for any external consumer.
export { XIcon as _XIcon };
