"use client";

import { toast } from "sonner";

import type { ErrorCode, ServerActionResult } from "@/lib/errors";

/**
 * Toast helpers — prompt.md §2B-D.14.
 *
 * Feature code MUST route through this module; direct imports from `sonner`
 * outside this file are forbidden (prompt.md Appendix A + CLAUDE.md §5).
 * The helpers map `ServerActionResult.error` codes to user-safe copy so every
 * caller gets identical messaging for the same failure mode.
 */

type ToastOptions = Readonly<{ description?: string; duration?: number }>;

export function toastSuccess(title: string, options: ToastOptions = {}): void {
  toast.success(title, {
    description: options.description,
    duration: options.duration ?? 3_000,
  });
}

export function toastInfo(title: string, options: ToastOptions = {}): void {
  toast.info(title, { description: options.description, duration: options.duration ?? 4_000 });
}

export function toastWarning(title: string, options: ToastOptions = {}): void {
  toast.warning(title, { description: options.description, duration: options.duration ?? 5_000 });
}

/**
 * Offline-queue acknowledgement. Visual language distinct from success so
 * users don't mistake a queued mutation for a completed one.
 */
export function toastQueued(title: string, options: ToastOptions = {}): void {
  toast.message(title, { description: options.description, duration: options.duration ?? 4_000 });
}

const ERROR_MESSAGES: Record<ErrorCode, { title: string; description: string }> = {
  VALIDATION_FAILED: {
    title: "Please fix the highlighted fields.",
    description: "Some inputs didn't match the expected format.",
  },
  UNAUTHENTICATED: {
    title: "Session expired.",
    description: "Sign in again to continue.",
  },
  FORBIDDEN: {
    title: "You don't have permission.",
    description: "Contact your administrator if you believe this is an error.",
  },
  NOT_FOUND: {
    title: "We couldn't find that.",
    description: "It may have been moved or deleted.",
  },
  CONFLICT: {
    title: "This conflicts with existing data.",
    description: "Reload and try again.",
  },
  STALE_DATA: {
    title: "Someone else updated this first.",
    description: "Refresh and redo your changes.",
  },
  RATE_LIMITED: {
    title: "Too many attempts.",
    description: "Wait a moment before trying again.",
  },
  DEPENDENCY_FAILED: {
    title: "An upstream service is unavailable.",
    description: "Try again shortly; we're watching it.",
  },
  INTERNAL: {
    title: "Something went wrong on our end.",
    description: "The issue has been logged.",
  },
};

/**
 * Display the canonical toast for a failed server action. Accepts either the
 * raw `ServerActionResult` OR a bare `ErrorCode` for direct use from error
 * handlers.
 */
export function toastError(input: ServerActionResult<unknown> | ErrorCode): void {
  const code: ErrorCode =
    typeof input === "string" ? input : input.success ? "INTERNAL" : input.error;
  const { title, description } = ERROR_MESSAGES[code];
  toast.error(title, { description, duration: 6_000 });
}
