"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/components/ui/toast-helpers";

import { resolveIncidentAction } from "@/features/incidents/actions/resolve-incident";
import { RESOLUTION_NOTES_MAX, RESOLUTION_NOTES_MIN } from "@/features/incidents/schemas/incident";

export type IncidentResolveDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  /** Short recap rendered above the notes textarea so the resolver has
   *  context without leaving the dialog. */
  incidentSummary: string;
  onResolved?: () => void;
}>;

/**
 * Manager-only resolve flow. Requires a short resolution note that
 * persists to `incidents.metadata.resolution_notes` via
 * `resolveIncidentAction`.
 */
export function IncidentResolveDialog({
  open,
  onOpenChange,
  incidentId,
  incidentSummary,
  onResolved,
}: IncidentResolveDialogProps) {
  const [notes, setNotes] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const reset = React.useCallback(() => {
    setNotes("");
    setError(null);
  }, []);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleSubmit = () => {
    const trimmed = notes.trim();
    if (trimmed.length < RESOLUTION_NOTES_MIN) {
      setError("Add a brief resolution note.");
      return;
    }
    if (trimmed.length > RESOLUTION_NOTES_MAX) {
      setError(`Keep notes under ${RESOLUTION_NOTES_MAX} characters.`);
      return;
    }
    startTransition(async () => {
      const result = await resolveIncidentAction({ id: incidentId, notes: trimmed });
      if (result.success) {
        toastSuccess("Incident resolved");
        onResolved?.();
        onOpenChange(false);
      } else {
        toastError(result);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve incident</AlertDialogTitle>
          <AlertDialogDescription>{incidentSummary}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="incident-resolve-notes">Resolution notes</Label>
          <Textarea
            id="incident-resolve-notes"
            rows={4}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
            }}
            placeholder="What was done to resolve this?"
            maxLength={RESOLUTION_NOTES_MAX}
            disabled={isPending}
            data-testid="incident-resolve-notes"
          />
          {error ? (
            <p
              role="alert"
              className="text-status-danger-foreground text-xs"
              data-testid="incident-resolve-error"
            >
              {error}
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            data-testid="incident-resolve-confirm"
          >
            <CheckCircle2 aria-hidden className="size-4" />
            <span>{isPending ? "Resolving…" : "Mark resolved"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
