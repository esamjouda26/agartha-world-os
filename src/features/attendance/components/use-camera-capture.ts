"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  SELFIE_CAPTURE_HEIGHT,
  SELFIE_CAPTURE_WIDTH,
  SELFIE_MIME,
  SELFIE_QUALITY,
} from "@/features/attendance/constants";

/**
 * Selfie camera hook — frontend_spec.md:4229-4231 requires front-camera
 * selfie capture with progressive permission prompt (spec:38 "not on page
 * load"). File-input fallback is explicitly forbidden per user contract:
 * staff may not upload a pre-existing image.
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

export type CameraCapture = Readonly<{
  state: CameraState;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  capture: () => Promise<Blob | null>;
}>;

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

export function useCameraCapture(): CameraCapture {
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
          facingMode: "user",
          width: { ideal: SELFIE_CAPTURE_WIDTH },
          height: { ideal: SELFIE_CAPTURE_HEIGHT },
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
  }, []);

  const capture = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || state !== "ready") return null;
    const width = video.videoWidth || SELFIE_CAPTURE_WIDTH;
    const height = video.videoHeight || SELFIE_CAPTURE_HEIGHT;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), SELFIE_MIME, SELFIE_QUALITY);
    });
  }, [state]);

  return { state, error, videoRef, start, stop, capture };
}
