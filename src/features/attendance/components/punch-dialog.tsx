"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Aperture,
  Camera,
  Check,
  Clock,
  Loader2,
  MapPin,
  RotateCcw,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastInfo, toastSuccess } from "@/components/ui/toast-helpers";
import { clockInAction } from "@/features/attendance/actions/clock-in";
import { clockOutAction } from "@/features/attendance/actions/clock-out";
import { uploadSelfie } from "@/features/attendance/components/upload-selfie";
import {
  useCameraCapture,
  type CameraState,
} from "@/features/attendance/components/use-camera-capture";
import { useGpsFix } from "@/features/attendance/components/use-gps-fix";
import {
  displayShiftName,
  displayShiftWindow,
} from "@/features/attendance/components/shift-display";
import type { TodayShift } from "@/features/attendance/types";

/**
 * PunchDialog — DingTalk-inspired capture→preview→confirm flow.
 *
 * The `<video>` element stays mounted across phases — capture and preview
 * share the same video node, toggled by opacity/display so the underlying
 * `srcObject` (the MediaStream) never detaches. Without this, clicking
 * Retake would remount the `<video>` and leave the new element with no
 * stream attached (black frame). The captured still image is overlaid
 * on top of the live feed during the preview phase.
 */

type PunchKind = "clock-in" | "clock-out";

type Phase = "capture" | "preview" | "submitting";

export type PunchDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PunchKind;
  shift: TodayShift;
}>;

const PUNCH_LABELS = {
  "clock-in": {
    title: "Clock in",
    action: "Confirm clock-in",
    submitted: "Clocked in successfully.",
  },
  "clock-out": {
    title: "Clock out",
    action: "Confirm clock-out",
    submitted: "Clocked out successfully.",
  },
} as const satisfies Record<PunchKind, { title: string; action: string; submitted: string }>;

const CAMERA_ERROR_TITLES: Partial<Record<CameraState, { title: string; body: string }>> = {
  unsupported: {
    title: "Camera unavailable",
    body: "This browser cannot open the front camera. Use a supported device to clock in.",
  },
  denied: {
    title: "Camera permission required",
    body: "Enable camera access in your browser settings, then reopen this dialog. Access restores automatically once you allow it.",
  },
  "hardware-busy": {
    title: "Camera is in use",
    body: "Close any other app or tab using the camera and try again.",
  },
  "not-found": {
    title: "No camera detected",
    body: "This device has no front-facing camera. Use a device with a camera to clock in.",
  },
  overconstrained: {
    title: "Camera doesn't support capture",
    body: "Your camera can't meet the required resolution. Contact IT.",
  },
  "unknown-error": {
    title: "Couldn't start the camera",
    body: "Try again, and contact IT if it keeps failing.",
  },
};

export function PunchDialog({ open, onOpenChange, kind, shift }: PunchDialogProps) {
  const router = useRouter();
  const labels = PUNCH_LABELS[kind];
  const camera = useCameraCapture();
  const gps = useGpsFix();
  const [phase, setPhase] = useState<Phase>("capture");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [captureAt, setCaptureAt] = useState<Date | null>(null);

  const revokePhoto = useCallback(() => {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
    }
  }, []);

  // Stable refs for the imperative hook methods — `camera` / `gps` return
  // a new object identity on every render (their state fields change), so
  // adding them to deps below would spin the effect in an infinite loop
  // each time camera.start() updated state. We hold the current functions
  // in refs and trigger solely off `open`.
  const startCameraRef = useRef(camera.start);
  const stopCameraRef = useRef(camera.stop);
  const requestGpsRef = useRef(gps.request);
  startCameraRef.current = camera.start;
  stopCameraRef.current = camera.stop;
  requestGpsRef.current = gps.request;

  useEffect(() => {
    if (!open) {
      revokePhoto();
      setPhase("capture");
      setPhotoBlob(null);
      setPhotoUrl(null);
      setNote("");
      setCaptureAt(null);
      stopCameraRef.current();
      return;
    }
    void startCameraRef.current();
    void requestGpsRef.current();
  }, [open, revokePhoto]);

  // Manage the Object URL for the captured still image.
  useEffect(() => {
    if (!photoBlob) {
      revokePhoto();
      setPhotoUrl(null);
      return;
    }
    revokePhoto();
    const url = URL.createObjectURL(photoBlob);
    photoUrlRef.current = url;
    setPhotoUrl(url);
    return () => {
      revokePhoto();
    };
  }, [photoBlob, revokePhoto]);

  const onShutter = useCallback(async () => {
    const blob = await camera.capture();
    if (!blob) {
      toastError({ success: false, error: "VALIDATION_FAILED" });
      return;
    }
    setPhotoBlob(blob);
    setCaptureAt(new Date());
    setPhase("preview");
    // Intentionally do NOT stop the camera stream — we want it still
    // running so clicking Retake resumes live preview instantly.
  }, [camera]);

  const onRetake = useCallback(() => {
    setPhotoBlob(null);
    setCaptureAt(null);
    setPhase("capture");
  }, []);

  const onConfirm = useCallback(async () => {
    if (!photoBlob) return;
    setPhase("submitting");
    const fileId = crypto.randomUUID();
    const gpsFix = gps.fix;
    const trimmedNote = note.trim();

    try {
      const selfieUrl = await uploadSelfie(photoBlob, shift.schedule.shift_date, kind, fileId);
      const action = kind === "clock-in" ? clockInAction : clockOutAction;
      const result = await action({
        gps: gpsFix,
        selfieUrl,
        remark: trimmedNote.length > 0 ? trimmedNote : null,
      });
      if (result.success) {
        toastSuccess(labels.submitted);
        router.refresh();
        onOpenChange(false);
      } else {
        toastError(result);
        setPhase("preview");
      }
    } catch (err) {
      toastError({ success: false, error: "INTERNAL" });
      if (err instanceof Error) toastInfo(`Network Error: Could not reach the server.`);
      setPhase("preview");
    }
  }, [
    photoBlob,
    gps.fix,
    note,
    shift.schedule.shift_date,
    kind,
    labels.submitted,
    router,
    onOpenChange,
  ]);

  const busy = phase === "submitting";
  const errorCopy = CAMERA_ERROR_TITLES[camera.state];
  const showPreviewOverlay = phase === "preview" || phase === "submitting";

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-lg gap-0 p-0" data-testid="punch-dialog">
        <DialogHeader className="border-border-subtle border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Clock aria-hidden className="size-5" />
            {labels.title}
          </DialogTitle>
          <DialogDescription className="text-foreground-muted text-sm">
            <ShiftSummary shift={shift} />
          </DialogDescription>
        </DialogHeader>

        {errorCopy ? (
          <div className="p-5">
            <Alert role="alert" aria-live="assertive" data-testid={`punch-camera-${camera.state}`}>
              <AlertTriangle aria-hidden className="size-4" />
              <AlertTitle>{errorCopy.title}</AlertTitle>
              <AlertDescription>
                {errorCopy.body}
                {camera.error ? (
                  <span className="text-foreground-subtle mt-2 block text-xs">
                    Detail: {camera.error}
                  </span>
                ) : null}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            {/* Persistent camera surface. The <video> element stays mounted
                across phases so the MediaStream attachment survives a
                Retake — otherwise we'd see a black frame on remount. */}
            <div className="relative" data-testid="punch-dialog-capture">
              <div className="bg-foreground/5 relative aspect-[3/4] w-full overflow-hidden">
                <video
                  ref={camera.videoRef}
                  autoPlay
                  muted
                  playsInline
                  aria-label="Live front-facing camera preview"
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-10 inset-y-10 rounded-[40px] border-2 border-white/60"
                />
                <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                  <GpsPill gps={gps} />
                  <CameraPill camera={camera} />
                </div>
                {phase === "capture" ? (
                  <button
                    type="button"
                    onClick={() => void onShutter()}
                    disabled={camera.state !== "ready"}
                    aria-label="Capture selfie"
                    className="focus-visible:outline-ring absolute bottom-4 left-1/2 size-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/95 shadow-lg transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95 disabled:opacity-60"
                    data-testid="punch-dialog-shutter-circle"
                  >
                    <span
                      aria-hidden
                      className="bg-brand-primary m-auto block size-10 rounded-full"
                    />
                  </button>
                ) : null}

                {/* Captured still image overlay — shown in preview and
                    submitting phases. Covers the live feed visually;
                    the stream stays alive underneath so Retake is
                    instant. */}
                {showPreviewOverlay && photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt="Captured selfie preview"
                    className="absolute inset-0 h-full w-full object-cover"
                    data-testid="punch-dialog-photo-preview"
                  />
                ) : null}

                {busy ? (
                  <div className="bg-background/50 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 aria-hidden className="size-8 animate-spin text-white" />
                  </div>
                ) : null}
              </div>

              {showPreviewOverlay ? (
                <PreviewMeta captureAt={captureAt} gps={gps} shift={shift} />
              ) : null}
            </div>

            {showPreviewOverlay && gps.error && !gps.fix ? (
              <div className="px-5 pt-4">
                <Alert role="alert" aria-live="polite" data-testid="punch-dialog-gps-warning">
                  <MapPin aria-hidden className="size-4" />
                  <AlertTitle>Location unavailable</AlertTitle>
                  <AlertDescription>
                    {gps.error}{" "}
                    <button
                      type="button"
                      onClick={() => void gps.request()}
                      className="text-brand-primary hover:text-brand-primary/80 underline underline-offset-2"
                      data-testid="punch-dialog-gps-retry"
                    >
                      Try again
                    </button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : null}

            {showPreviewOverlay ? (
              <div className="flex flex-col gap-1.5 px-5 pt-4">
                <label
                  htmlFor="punch-dialog-note"
                  className="text-foreground inline-flex items-center gap-2 text-xs font-medium"
                >
                  <StickyNote aria-hidden className="size-3.5" />
                  Note (optional) · saved with this punch
                </label>
                <Textarea
                  id="punch-dialog-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Anything to log with this punch? e.g. traffic delay, coverage handoff."
                  maxLength={240}
                  disabled={busy}
                  data-testid="punch-dialog-note"
                />
                <p className="text-foreground-subtle self-end text-[11px] tabular-nums">
                  {note.length}/240
                </p>
              </div>
            ) : null}
          </>
        )}

        <DialogFooter className="border-border-subtle gap-2 border-t px-5 py-4 sm:justify-between">
          {phase === "capture" ? (
            <>
              <DialogClose asChild>
                <Button variant="ghost" disabled={busy} data-testid="punch-dialog-cancel">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                size="lg"
                onClick={() => void onShutter()}
                disabled={camera.state !== "ready"}
                data-testid="punch-dialog-shutter"
              >
                <Aperture aria-hidden className="size-4" />
                Capture
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onRetake}
                disabled={busy}
                data-testid="punch-dialog-retake"
              >
                <RotateCcw aria-hidden className="size-4" />
                Retake
              </Button>
              <Button
                size="lg"
                onClick={() => void onConfirm()}
                disabled={busy}
                aria-busy={busy || undefined}
                data-testid="punch-dialog-confirm"
              >
                {busy ? (
                  <>
                    <Loader2 aria-hidden className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Check aria-hidden className="size-4" />
                    {labels.action}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShiftSummary({ shift }: Readonly<{ shift: TodayShift }>) {
  const name = displayShiftName(shift.shiftType.name);
  const window = displayShiftWindow(shift) ?? "—";
  return (
    <>
      {name} · {window}
    </>
  );
}

function PreviewMeta({
  captureAt,
  gps,
  shift,
}: Readonly<{
  captureAt: Date | null;
  gps: ReturnType<typeof useGpsFix>;
  shift: TodayShift;
}>) {
  const stamp = captureAt ? format(captureAt, "p") : "—";
  return (
    <dl className="bg-surface/90 border-border-subtle grid grid-cols-3 gap-3 border-t px-5 py-3 text-xs">
      <Meta icon={<Clock aria-hidden className="size-3.5" />} label="Captured" value={stamp} />
      <Meta
        icon={<Camera aria-hidden className="size-3.5" />}
        label="Shift"
        value={displayShiftName(shift.shiftType.name)}
      />
      <Meta
        icon={<MapPin aria-hidden className="size-3.5" />}
        label="Location"
        value={
          gps.fix ? `±${Math.round(gps.fix.accuracy)} m` : gps.pending ? "Locating…" : "Unavailable"
        }
      />
    </dl>
  );
}

function Meta({
  icon,
  label,
  value,
}: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="text-foreground-muted mt-0.5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-foreground-subtle text-[10px] tracking-wide uppercase">{label}</dt>
        <dd className="text-foreground truncate text-sm font-medium tabular-nums">{value}</dd>
      </div>
    </div>
  );
}

function GpsPill({ gps }: Readonly<{ gps: ReturnType<typeof useGpsFix> }>) {
  let tone: string;
  let label: string;
  const clickable = !gps.pending && !gps.fix;
  if (gps.fix) {
    tone = "bg-status-success-bg-soft text-status-success-foreground border-status-success-border";
    label = "GPS ready";
  } else if (gps.pending) {
    tone = "bg-status-info-bg-soft text-status-info-foreground border-status-info-border";
    label = "Locating…";
  } else if (gps.status === "denied") {
    tone = "bg-status-danger-bg-soft text-status-danger-foreground border-status-danger-border";
    label = "Location blocked";
  } else {
    tone = "bg-status-warning-bg-soft text-status-warning-foreground border-status-warning-border";
    label = "Retry GPS";
  }
  const commonCls = `inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`;
  if (clickable) {
    return (
      <button
        type="button"
        onClick={() => void gps.request()}
        data-testid="punch-dialog-gps-pill"
        className={`${commonCls} focus-visible:outline-ring cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
        title={gps.error ?? undefined}
      >
        <MapPin aria-hidden className="size-3" />
        {label}
      </button>
    );
  }
  return (
    <span data-testid="punch-dialog-gps-pill" className={commonCls} title={gps.error ?? undefined}>
      <MapPin aria-hidden className="size-3" />
      {label}
    </span>
  );
}

function CameraPill({ camera }: Readonly<{ camera: ReturnType<typeof useCameraCapture> }>) {
  const ready = camera.state === "ready";
  const pending = camera.state === "pending";
  const tone = ready
    ? "bg-status-success-bg-soft text-status-success-foreground border-status-success-border"
    : pending
      ? "bg-status-info-bg-soft text-status-info-foreground border-status-info-border"
      : "bg-status-warning-bg-soft text-status-warning-foreground border-status-warning-border";
  return (
    <span
      data-testid="punch-dialog-camera-pill"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      <Camera aria-hidden className="size-3" />
      {ready ? "Camera live" : pending ? "Starting…" : "Camera off"}
    </span>
  );
}
