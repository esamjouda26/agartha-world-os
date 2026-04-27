import * as React from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

/**
 * BookingQrCode — server-rendered inline-SVG QR code.
 *
 * Renders without `dangerouslySetInnerHTML` (CLAUDE.md §8 forbids it). We
 * use `QRCode.create()` to obtain the binary module matrix, then map "on"
 * modules to a single SVG `<path>` element built with React. The result is
 * one DOM node per QR — sharper, cheaper, and fully composable with
 * `currentColor` so the QR inherits theme.
 *
 * The QR is the page's primary functional element (the gate scans this);
 * everything else on /my-booking/manage is supporting data.
 */

export type BookingQrCodeProps = Readonly<{
  value: string;
  /** Pixel size for both width + height. */
  size?: number;
  /** Quiet zone in module units around the matrix. RFC: 4 modules minimum. */
  quietZone?: number;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}>;

export function BookingQrCode({
  value,
  size = 280,
  quietZone = 4,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: BookingQrCodeProps) {
  const qr = QRCode.create(value, {
    errorCorrectionLevel: "M",
  });
  const matrixSize = qr.modules.size;
  const data = qr.modules.data;
  const fullSize = matrixSize + quietZone * 2;

  // Build a single path string from "on" modules. Each on-module contributes
  // an absolute-positioned `M{x},{y}h1v1h-1z` subpath, which renders as a
  // 1×1 filled square. The browser's path renderer collapses adjacent
  // squares for free.
  let d = "";
  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (data[y * matrixSize + x]) {
        d += `M${x + quietZone},${y + quietZone}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? "Booking QR code"}
      data-testid={testId ?? "booking-qr-code"}
      width={size}
      height={size}
      viewBox={`0 0 ${fullSize} ${fullSize}`}
      shapeRendering="crispEdges"
      className={cn("text-foreground", className)}
    >
      {/* White quiet zone — keeps scanners happy under any background. */}
      <rect width={fullSize} height={fullSize} fill="white" />
      <path d={d} fill="currentColor" />
    </svg>
  );
}
