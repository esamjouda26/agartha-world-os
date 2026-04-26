"use client";

import { useState, useRef, useEffect } from "react";

import { Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCameraCapture } from "@/hooks/use-camera-capture";

type QRScannerProps = Readonly<{
  onScan: (value: string) => void;
  disabled?: boolean;
}>;

/**
 * Camera-based QR scanner.
 * Camera permission is requested on the first button press, not on mount —
 * per frontend_spec.md:38 ("not on page load").
 * Loaded via next/dynamic in the parent to keep the bundle lean.
 * Uses BarcodeDetector (Chrome 83+, Safari 17+) for frame decoding.
 */
export function QRScanner({ onScan, disabled = false }: QRScannerProps) {
  const { state, error, videoRef, start, stop } = useCameraCapture({
    facingMode: "environment",
    width: 640,
    height: 480,
  });
  const animFrameRef = useRef<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Run BarcodeDetector loop once camera is ready
  useEffect(() => {
    if (state !== "ready") return;

    let cancelled = false;

    async function detect() {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video) return;

      if ("BarcodeDetector" in window) {
        try {
          // @ts-expect-error BarcodeDetector not in TS stdlib
          const detector = new BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const first = barcodes[0] as { rawValue: string };
            stop();
            onScan(first.rawValue);
            return;
          }
        } catch {
          // Continue; detector may fail on an empty frame
        }
      }

      if (!cancelled) {
        animFrameRef.current = requestAnimationFrame(() => {
          void detect();
        });
      }
    }

    void detect();

    return () => {
      cancelled = true;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [state, videoRef, stop, onScan]);

  async function handleStartScan() {
    setScanError(null);
    await start();
  }

  const isScanning = state === "ready";
  const cameraError = error ?? (state === "denied" ? "Camera access denied" : null);

  if (!isScanning) {
    return (
      <div className="flex flex-col items-center gap-3">
        {(cameraError ?? scanError) && (
          <p className="text-destructive text-sm" role="alert">
            {cameraError ?? scanError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="min-h-[52px] w-full gap-2 font-semibold"
          onClick={handleStartScan}
          disabled={disabled || state === "pending"}
          data-testid="qr-scanner-start"
        >
          <Camera size={20} />
          {state === "pending" ? "Requesting camera…" : "Scan QR Code"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border relative overflow-hidden rounded-xl border bg-black">
        <video
          ref={videoRef}
          className="h-56 w-full object-cover"
          playsInline
          muted
          aria-label="QR scanner camera view"
        />
        {/* Scan reticle */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div className="h-40 w-40 rounded-2xl border-2 border-white/60" />
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full"
        onClick={stop}
        data-testid="qr-scanner-stop"
      >
        Cancel Scan
      </Button>
    </div>
  );
}
