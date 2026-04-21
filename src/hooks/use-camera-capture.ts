"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic camera capture hook — cross-cutting per CLAUDE.md §1 (used by
 * `/crew/attendance` selfie, `/crew/pos` selfie, `/crew/zone-scan` QR,
 * `/my-booking/manage/biometrics` face capture).
 *
 * Progressive permission per frontend_spec.md:38 ("not on page load"): call
 * `start()` on user gesture only. File-input fallback is NOT surfaced — live
 * capture is deliberate (prevents pre-existing-image spoofing on selfie
 * flows).
 *
 * Lifecycle states:
 *   - idle            → hook mounted, no stream requested yet.
 *   - pending         → `start()` called, awaiting `getUserMedia` resolution.
 *   - ready           → stream bound to <video>, user may click "Capture".
 *   - denied          → `NotAllowedError`: user/policy rejected permission.
 *   - hardware-busy   → `NotReadableError`: camera in use by another app.
 *   - not-found       → `NotFoundError`: no camera device present.
 *   - overconstrained → `OverconstrainedError`: requested resolution
 *                       unsatisfiable.
 *   - unsupported     → `getUserMedia` missing entirely (older browser,
 *                       insecure context).
 *   - unknown-error   → any other `DOMException` — surface the raw message
 *                       so support can triage.
 *
 * Recovery: when supported, a `navigator.permissions.query({name: "camera"})`
 * subscription flips state from `denied` back to `idle` the moment the user
 * resets the permission in browser settings — no manual re-click required.
 * Safari throws `TypeError` on `permissions.query({name: "camera"})`; the
 * subscription is wrapped in try/catch so that path is handled gracefully.
 *
 * Tracks are stopped on unmount and after capture to prevent the camera LED
 * from staying on (CLAUDE.md §3 Permissions-Policy opt-in contract).
 */
export type CameraState =
  | "idle"
  | "pending"
  | "ready"
  | "denied"
  | "hardware-busy"
  | "not-found"
  | "overconstrained"
  | "unsupported"
  | "unknown-error";

export type CameraFacingMode = "user" | "environment";

export type CameraCaptureOptions = Readonly<{
  /** Front-facing ("user", selfie) vs rear-facing ("environment", QR). */
  facingMode?: CameraFacingMode;
  /** Ideal capture width. Defaults to 640. */
  width?: number;
  /** Ideal capture height. Defaults to 480. */
  height?: number;
  /** Output MIME for the captured blob. Defaults to `image/webp`. */
  mimeType?: string;
  /** Lossy quality [0..1]. Defaults to 0.8. */
  quality?: number;
}>;

export type CameraCapture = Readonly<{
  state: CameraState;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  capture: () => Promise<Blob | null>;
}>;

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 480;
const DEFAULT_MIME = "image/webp";
const DEFAULT_QUALITY = 0.8;

/**
 * Map a `getUserMedia` rejection to a specific state. Kept as a pure helper
 * so the integration tests can exercise it without a real camera.
 */
export function classifyCameraError(err: unknown): CameraState {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "denied";
      case "NotReadableError":
      case "AbortError":
        return "hardware-busy";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "not-found";
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "overconstrained";
      default:
        return "unknown-error";
    }
  }
  return "unknown-error";
}

export function useCameraCapture(options: CameraCaptureOptions = {}): CameraCapture {
  const {
    facingMode = "user",
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
    mimeType = DEFAULT_MIME,
    quality = DEFAULT_QUALITY,
  } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  // Cleanup on unmount: stop any active stream so the camera LED turns off.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Permissions-API subscription. Auto-recovers from `denied` → `idle` when
  // the user resets the permission via browser settings. Wrapped in try/catch
  // because Safari throws TypeError on `permissions.query({name: "camera"})`
  // (webkit hasn't implemented the Permissions API for camera/microphone).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;

    let status: PermissionStatus | null = null;
    let cancelled = false;

    const handleChange = () => {
      if (cancelled || !status) return;
      if (status.state === "granted") {
        // User just granted permission in browser settings while denied.
        // Flip back to idle so the UI re-enables the "Enable Camera" CTA
        // (clicking it will now succeed without the user doing anything).
        setState((prev) => (prev === "denied" ? "idle" : prev));
        setError(null);
      } else if (status.state === "denied") {
        setState("denied");
      }
    };

    try {
      // `PermissionName` only includes standard values in the TS lib; `camera`
      // is widely implemented but not yet in the lib. Cast is intentional.
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((result) => {
          if (cancelled) return;
          status = result;
          result.addEventListener("change", handleChange);
        })
        .catch(() => {
          // Safari / older browsers — fall through to manual retry.
        });
    } catch {
      // Synchronous throw (Safari TypeError). Auto-recovery unavailable;
      // users will need to click "Enable Camera" again after resetting
      // permission in browser settings.
    }

    return () => {
      cancelled = true;
      status?.removeEventListener("change", handleChange);
    };
  }, []);

  const start = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setState("unsupported");
      setError("This browser does not support camera capture.");
      return;
    }
    setState("pending");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          // `play()` may reject (autoplay policies) OR throw synchronously
          // on engines that don't implement it (jsdom). Wrap in try/catch
          // so a "Not implemented" error in tests doesn't capsize the
          // whole state machine — the capture path works via `drawImage`
          // even if the video never actually plays in the test env.
          await videoRef.current.play();
        } catch {
          // Intentional no-op.
        }
      }
      setState("ready");
    } catch (err) {
      setState(classifyCameraError(err));
      setError(err instanceof Error ? err.message : "Camera capture failed.");
    }
  }, [facingMode, width, height]);

  const capture = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || state !== "ready") return null;
    const w = video.videoWidth || width;
    const h = video.videoHeight || height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  }, [state, width, height, mimeType, quality]);

  return { state, error, videoRef, start, stop, capture };
}
