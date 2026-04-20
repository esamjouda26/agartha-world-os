"use client";

import { useCallback, useEffect, useState } from "react";

import type { GpsFix } from "@/features/attendance/types";

/**
 * GPS hook — frontend_spec.md:4229 calls for `navigator.geolocation` on
 * the clock-in surface. We defer the actual request to user-initiated
 * (CLAUDE.md §3 progressive-permission) and fall through a two-step
 * accuracy ladder so the fix lands across every device profile:
 *
 *   1. `enableHighAccuracy: true` (GPS hardware) — best on mobile.
 *   2. On failure/timeout, `enableHighAccuracy: false` (network / Wi-Fi /
 *      IP) — works on desktop where there's no GPS radio.
 *
 * A third layer of resilience: we subscribe to the Permissions API for
 * `geolocation`. When it resolves `denied` we short-circuit and surface
 * a clear message to the user rather than silently failing. When it
 * later flips to `granted` (user resets permission in browser settings)
 * the hook clears its cached error so a retry can succeed.
 *
 * Null fix is an acceptable outcome — `rpc_clock_in` accepts
 * `p_gps JSONB DEFAULT NULL` ([init_schema.sql:5926](supabase/migrations/20260417064731_init_schema.sql#L5926)).
 * The UI treats GPS as best-effort.
 */
export type GeolocationStatus = "prompt" | "granted" | "denied" | "unsupported";

export function useGpsFix(): Readonly<{
  fix: GpsFix | null;
  error: string | null;
  pending: boolean;
  status: GeolocationStatus;
  request: () => Promise<GpsFix | null>;
}> {
  const [fix, setFix] = useState<GpsFix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<GeolocationStatus>("prompt");

  // Subscribe to the Permissions API (widely supported on Chrome/Firefox
  // including desktop; Safari throws on the `query`). When the user flips
  // permission in site settings, auto-flip our status so a retry Just
  // Works without forcing them to remember what went wrong.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return;
    }
    let cancelled = false;
    let subscription: PermissionStatus | null = null;

    const apply = (state: PermissionState) => {
      if (cancelled) return;
      if (state === "granted") {
        setStatus("granted");
        setError(null);
      } else if (state === "denied") {
        setStatus("denied");
      } else {
        setStatus("prompt");
      }
    };

    try {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (cancelled) return;
          subscription = result;
          apply(result.state);
          result.addEventListener("change", () => apply(result.state));
        })
        .catch(() => {
          // Safari / Firefox private mode — fall through to runtime call.
        });
    } catch {
      // Synchronous TypeError (older Safari). Ignore; we'll just rely on
      // getCurrentPosition for state.
    }

    return () => {
      cancelled = true;
      subscription?.removeEventListener("change", () => {});
    };
  }, []);

  const request = useCallback(async (): Promise<GpsFix | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("Your browser doesn't expose geolocation.");
      return null;
    }
    setPending(true);
    setError(null);

    const tryOnce = (options: PositionOptions): Promise<GpsFix> =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          (err) => reject(err),
          options,
        );
      });

    try {
      // Step 1: high-accuracy (GPS hardware). Longer timeout so users who
      // take their time on the permission prompt don't race through it.
      const high = await tryOnce({
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 60_000,
      });
      setFix(high);
      setStatus("granted");
      setPending(false);
      return high;
    } catch (highErr) {
      // If the high-accuracy attempt failed with PERMISSION_DENIED (code
      // 1), the low-accuracy attempt will hit the same block. Short-
      // circuit with a clear message so the user knows what to fix.
      if (
        highErr instanceof GeolocationPositionError &&
        highErr.code === highErr.PERMISSION_DENIED
      ) {
        setStatus("denied");
        setError(
          "Location permission is blocked. Enable it in your browser settings and try again.",
        );
        setPending(false);
        return null;
      }

      try {
        // Step 2: network-based positioning. Desktop devices with no GPS
        // radio rely on this path. Permissive `maximumAge` — crew
        // clocking in from a fixed site don't need fresh coordinates
        // every punch.
        const low = await tryOnce({
          enableHighAccuracy: false,
          timeout: 10_000,
          maximumAge: 5 * 60_000,
        });
        setFix(low);
        setStatus("granted");
        setPending(false);
        return low;
      } catch (lowErr) {
        const positionErr =
          lowErr instanceof GeolocationPositionError
            ? lowErr
            : highErr instanceof GeolocationPositionError
              ? highErr
              : null;
        const message = positionErr
          ? humanizeGeolocationError(positionErr)
          : "Couldn't determine your location. GPS is optional — you can still clock in.";
        setError(message);
        // If either attempt surfaced PERMISSION_DENIED we reflect that in
        // status so the UI shows the actionable "reset permission" copy.
        if (positionErr && positionErr.code === positionErr.PERMISSION_DENIED) {
          setStatus("denied");
        }
        setPending(false);
        return null;
      }
    }
  }, []);

  return { fix, error, pending, status, request };
}

function humanizeGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission is blocked. Enable it in your browser settings and try again.";
    case err.POSITION_UNAVAILABLE:
      return "Couldn't get a location fix. Your device may be offline or without GPS signal. GPS is optional — you can still clock in.";
    case err.TIMEOUT:
      return "Location lookup timed out. GPS is optional — you can still clock in.";
    default:
      return (
        err.message || "Couldn't determine your location. GPS is optional — you can still clock in."
      );
  }
}
