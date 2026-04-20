"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";
import { voidOwnPunchAction } from "@/features/attendance/actions/void-own-punch";

/**
 * "Undo" affordance on the most recent punch — enables staff to cancel
 * an accidental clock-in/clock-out within a 5-minute grace window.
 * Server-side window enforced by the `rpc_void_own_punch` RPC; this
 * client-side `secondsLeft` just drives the tooltip + title.
 */
export type UndoPunchButtonProps = Readonly<{
  punchId: string;
  secondsLeft: number;
}>;

export function UndoPunchButton({ punchId, secondsLeft }: UndoPunchButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const minutes = Math.max(0, Math.floor(secondsLeft / 60));
  const seconds = Math.max(0, secondsLeft % 60);
  const remaining = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const onUndo = () => {
    startTransition(async () => {
      const result = await voidOwnPunchAction({ punchId });
      if (result.success) {
        toastSuccess("Punch voided. You can redo the action.");
        router.refresh();
      } else {
        toastError(result);
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={(event) => {
        // Stop the event so the parent row's click handler (if any) doesn't
        // also fire and open a detail sheet.
        event.stopPropagation();
        onUndo();
      }}
      disabled={isPending}
      aria-busy={isPending || undefined}
      className="text-status-warning-foreground hover:text-status-warning-foreground"
      data-testid={`attendance-punch-undo-${punchId}`}
      title={`Undo available for ${remaining}`}
    >
      <Undo2 aria-hidden className="size-3.5" />
      Undo
    </Button>
  );
}
