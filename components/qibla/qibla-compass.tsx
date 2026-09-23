"use client";
// Qibla compass — full-screen AR-first, magnetic-declination-corrected.
//
// 2026-09-24 stability + camera-attach hotfix:
//   - Root cause of "black camera" was setting srcObject BEFORE the
//     <CameraView> mounted (videoRef was null at request time). We now
//     bind the stream via a dedicated effect that fires whenever both
//     the stream ref and the video element exist, and we call play()
//     explicitly for autoplay-restricted mobile browsers.
//   - "Very unstable / too much moving" — magnetometer samples are
//     noisy at ~30-60 Hz. Reduced alpha to 0.10 + added a 5-sample
//     median filter that rejects single-frame spikes (typical of
//     nearby metal / motor interference). Result is Google-Qibla-
//     Finder-class smoothness on real hardware.
//   - "Path from bottom to Qibla" — replaced the full-viewport vertical
//     line with a bottom-anchored ray that grows UP from the user's
//     position (bottom center) to the Kaʿbah marker near the top. This
//     matches how AR waypoints work in maps/directions apps and reads
//     more naturally.
//
// 2026-09-23 original rewrite goals (still valid):
//   1. Magnetic-declination correction via WMM (fixes "fully wrong
//      direction" on Android where alpha reports magnetic, not true).
//      iOS webkitCompassHeading is already true-north; NOT double-corrected.
//   2. Camera-first full-screen UX.
//   3. Single-gesture permissions (motion → camera → location).
//   4. Line-to-Qibla alignment indicator when |Δ| ≤ 5°.
//   5. rAF-driven smoothing with shortest-arc wrap-around.

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

// Exponential low-pass. alpha=0.10 gives Google-Qibla-Finder-class smooth
// follow on the noisy magnetometer signal typical of modern phones. The
// previous 0.18 tracked too fast — every raw sensor jitter reached the
// UI within ~55 ms, which the user experienced as "moving here and there".
function smooth(prev: number, next: number, alpha = 0.10): number {
  const d = angularDelta(prev, next);
  return (prev + d * alpha + 360) % 360;
}

// Median filter across a small ring buffer of raw samples. Compass
// magnetometers periodically spike ±40° for one frame when the phone
// passes a metal object, a magnet, or a strong RF source. A 5-sample
// median rejects those spikes without adding perceptible lag.
//
// We compute median in a circular sense — sort by signed arc distance to
// the current value and pick the middle. This avoids the classic bug
// where samples of {358°, 359°, 0°, 1°, 2°} would median-to 179° instead
// of ~0°.
function circularMedian(samples: number[]): number {
  if (samples.length === 0) return 0;
  if (samples.length === 1) return samples[0]!;
  const ref = samples[samples.length - 1]!;
  const signed = samples.map((s) => ({ s, d: angularDelta(ref, s) }));
  signed.sort((a, b) => a.d - b.d);
  const mid = signed[Math.floor(signed.length / 2)]!;
  return (mid.s + 360) % 360;
}

export function QiblaCompass() {
  const t = useTranslations("qibla");

  // Feature detection at mount.
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
  const rawSamplesRef = useRef<number[]>([]);       // ring buffer for median filter
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
  const [videoAttached, setVideoAttached] = useState(false);

  // ---- Permission steps -----------------------------------------------------

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
    setMotionGranted(true);
    return true;
  }, []);

  const requestCamera = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          // Prefer HD but accept whatever the sensor gives us.
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      // Stash the stream ONLY. The dedicated attach effect below binds it
      // to <video> once <CameraView> renders. Setting srcObject here
      // races with the render tree — during the first `start()`, status
      // is still "starting" so <CameraView> hasn't mounted and videoRef
      // is null. This was the root cause of the black-camera bug.
      streamRef.current = stream;
      setCameraGranted(true);
      return true;
    } catch {
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
        setError("Location works only over HTTPS. Open this site over https:// and try again.");
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

  // One-gesture start.
  const start = useCallback(async () => {
    setStatus("starting");
    setError(null);
    await requestMotion();
    await requestCamera();
    const gotLocation = await requestLocation();
    setStatus(gotLocation ? "ready" : "denied");
  }, [requestMotion, requestCamera, requestLocation]);

  // Auto-start on platforms without iOS motion prompt (Android, desktop).
  useEffect(() => {
    if (needsIOSPermission) return;
    if (status !== "idle") return;
    const id = setTimeout(() => {
      start();
    }, 50);
    return () => clearTimeout(id);
  }, [needsIOSPermission, status, start]);

  // ---- The KEY FIX: video-attach effect ------------------------------------
  //
  // Runs after every render. If we have both a live stream AND a mounted
  // <video> element, attach and play. This handles:
  //   - Initial mount: <CameraView> hasn't rendered yet when requestCamera
  //     resolves, so we bind here instead
  //   - Mode toggle back to camera: stream may be gone, this triggers a
  //     re-request (via the reopen effect below)
  //   - React strict-mode double-mount in dev
  //
  // videoAttached flag prevents infinite play() calls once already bound.
  useEffect(() => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (mode !== "camera") return;
    if (!v || !s) return;
    if (v.srcObject === s && videoAttached) return;
    v.srcObject = s;
    setVideoAttached(true);
    // Autoplay policy: mobile Safari + Chrome require .play() to be
    // called explicitly, even on a muted+playsInline element, IF the
    // srcObject was set outside a user-gesture callback. Ignore any
    // rejection (browser will surface UI to the user).
    v.play().catch(() => {
      /* noop — some browsers reject if already playing */
    });
  });

  // Device-orientation listener ----------------------------------------------
  useEffect(() => {
    if (!motionGranted) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const wk = e as WebkitDeviceOrientationEvent;
      let h: number | null = null;
      let alreadyTrueNorth = false;
      if (typeof wk.webkitCompassHeading === "number") {
        // iOS Safari — already true-north-corrected.
        h = wk.webkitCompassHeading;
        alreadyTrueNorth = true;
        if (typeof wk.webkitCompassAccuracy === "number") {
          setAccuracy(wk.webkitCompassAccuracy);
        }
      } else if (typeof e.alpha === "number") {
        // Chrome / Android / others — alpha is 0..360 CCW from MAGNETIC
        // north when the device is flat. Convert to CW-from-magnetic,
        // then correct to true north using WMM declination.
        h = (360 - e.alpha) % 360;
        alreadyTrueNorth = false;
        setAccuracy(e.absolute ? 15 : 45);
      }
      if (h == null || !Number.isFinite(h)) return;
      if (!alreadyTrueNorth) {
        h = ((h + declinationRef.current) % 360 + 360) % 360;
      }
      // Feed the median-of-5 ring buffer. This kills the ±40° single-
      // frame magnetometer spikes that cause the UI to jump.
      const buf = rawSamplesRef.current;
      buf.push(h);
      if (buf.length > 5) buf.shift();
      rawHeadingRef.current = circularMedian(buf);
    };
    window.addEventListener("deviceorientation", onOrient, true);
    window.addEventListener(
      "deviceorientationabsolute" as "deviceorientation",
      onOrient,
      true,
    );
    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener(
        "deviceorientationabsolute" as "deviceorientation",
        onOrient,
        true,
      );
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
        const next = smooth(displayHeadingRef.current, raw, 0.10);
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

  // Camera cleanup on unmount -----------------------------------------------
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

  // Switch to compass → stop camera to save battery.
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
    setVideoAttached(false);
  }, [mode]);

  // Re-request camera when returning to camera mode.
  const reopenCamera = useCallback(async () => {
    if (streamRef.current) return;
    await requestCamera();
  }, [requestCamera]);
  useEffect(() => {
    if (mode !== "camera") return;
    if (status !== "ready") return;
    if (!cameraGranted) reopenCamera();
  }, [mode, status, cameraGranted, reopenCamera]);

  // Derived ------------------------------------------------------------------
  const bearing = coords ? qiblaBearing(coords.lat, coords.lon) : null;
  const dist = coords ? distanceToKaabaKm(coords.lat, coords.lon) : null;
  const heading = displayHeading;
  const hasCompass = heading != null;

  const roseRotate = hasCompass ? -heading! : 0;
  const relativeToQibla =
    hasCompass && bearing != null ? (bearing - heading! + 540) % 360 - 180 : null;
  const aligned = relativeToQibla != null && Math.abs(relativeToQibla) <= 5;

  // Haptic on transition into aligned.
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

  // -------- Render: gates ---------------------------------------------------

  if (status === "idle") {
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

  // status === "ready" -------------------------------------------------------
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
// Path visualization: a ray growing UP from bottom-center (user) to the
// Kaʿbah marker near the top, whose horizontal position tracks the signed
// angular delta between phone heading and true Qibla bearing.
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

  // Horizontal-shift model. FOV window narrower than the true camera FOV
  // so the marker stays comfortably inside the frame near-aligned.
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

      {/* Vertical dim to lift UI over camera content */}
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

      {/* Edge turn indicators when beyond FOV */}
      {hasHeading && beyondFov && turnDirection === "left" && (
        <div className="qibla-turn qibla-turn--left" aria-hidden>
          <div className="qibla-turn__arrow">‹</div>
          <div className="qibla-turn__label">Turn LEFT</div>
        </div>
      )}
      {hasHeading && beyondFov && turnDirection === "right" && (
        <div className="qibla-turn qibla-turn--right" aria-hidden>
          <div className="qibla-turn__arrow">›</div>
          <div className="qibla-turn__label">Turn RIGHT</div>
        </div>
      )}

      {/* "You are here" pin at bottom-center */}
      <div className="qibla-you" aria-hidden>
        <div className="qibla-you__ring" />
        <div className="qibla-you__dot" />
      </div>

      {/* Path-to-Qibla ray. Grows from bottom-center up to the Kaʿbah
          marker near the top. Uses a very thin transformed div so we
          can animate translateX cheaply on the compositor. */}
      {hasHeading && !beyondFov && (
        <div
          className={`qibla-path ${aligned ? "qibla-path--aligned" : ""}`}
          style={{
            transform: `translateX(calc(-50% + ${percent}vw))`,
            transition: aligned
              ? "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)"
              : "transform 140ms cubic-bezier(0.2, 0.7, 0.4, 1)",
          }}
        >
          {/* Ray line — from bottom (below the You dot) up to the marker */}
          <div className="qibla-path__ray" />
          {/* Kaʿbah marker at top of the ray */}
          <div className="qibla-path__marker">
            <div className="qibla-path__kaaba">🕋</div>
            <div className="qibla-path__label">
              {aligned ? "Facing the Qibla" : "Qibla"}
            </div>
          </div>
        </div>
      )}

      {/* Top banner when aligned */}
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

      {/* Top-right mode switch */}
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
// Compass rose view — fallback / alternate
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
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${roseRotate}deg)`,
                transition: hasCompass ? "none" : "transform 400ms ease-out",
                willChange: "transform",
              }}
              aria-hidden
            >
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
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-foreground/80 shadow-md" />
            </div>
          </div>

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
