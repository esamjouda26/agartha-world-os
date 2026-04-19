"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function FormsDemo() {
  const [emailError, setEmailError] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="ks-input-default">Input — default</Label>
        <Input
          id="ks-input-default"
          placeholder="you@example.com"
          data-testid="kitchen-sink-input-default"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ks-input-error">Input — invalid</Label>
        <Input
          id="ks-input-error"
          aria-invalid
          aria-describedby="ks-input-error-msg"
          defaultValue="not-an-email"
          data-testid="kitchen-sink-input-error"
        />
        <p id="ks-input-error-msg" role="alert" className="text-status-danger-foreground text-sm">
          Enter a valid email.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ks-input-disabled">Input — disabled</Label>
        <Input
          id="ks-input-disabled"
          disabled
          defaultValue="locked@example.com"
          data-testid="kitchen-sink-input-disabled"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ks-textarea">Textarea</Label>
        <Textarea
          id="ks-textarea"
          rows={3}
          placeholder="Notes..."
          data-testid="kitchen-sink-textarea"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ks-select">Select</Label>
        <Select>
          <SelectTrigger id="ks-select" data-testid="kitchen-sink-select-trigger">
            <SelectValue placeholder="Choose a portal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="management">Management</SelectItem>
            <SelectItem value="crew">Crew</SelectItem>
            <SelectItem value="guest">Guest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-foreground text-sm font-medium">RadioGroup</span>
        <RadioGroup defaultValue="email" className="space-y-2">
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="email"
              id="ks-radio-email"
              data-testid="kitchen-sink-radio-email"
            />
            <Label htmlFor="ks-radio-email">Email</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="sms" id="ks-radio-sms" data-testid="kitchen-sink-radio-sms" />
            <Label htmlFor="ks-radio-sms">SMS</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="none" id="ks-radio-none" disabled />
            <Label htmlFor="ks-radio-none" className="text-foreground-disabled">
              None (disabled)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <span className="text-foreground text-sm font-medium">Checkbox</span>
        <div className="flex items-center gap-2">
          <Checkbox id="ks-cb-on" defaultChecked data-testid="kitchen-sink-checkbox-checked" />
          <Label htmlFor="ks-cb-on">Email me product updates</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ks-cb-off" />
          <Label htmlFor="ks-cb-off">Subscribe to newsletter</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="ks-cb-disabled" disabled />
          <Label htmlFor="ks-cb-disabled" className="text-foreground-disabled">
            Disabled
          </Label>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-foreground text-sm font-medium">Switch</span>
        <div className="flex items-center gap-3">
          <Switch id="ks-switch-on" defaultChecked data-testid="kitchen-sink-switch-on" />
          <Label htmlFor="ks-switch-on">Realtime sync (on)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="ks-switch-off" />
          <Label htmlFor="ks-switch-off">Beta features (off)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="ks-switch-disabled" disabled />
          <Label htmlFor="ks-switch-disabled" className="text-foreground-disabled">
            Locked (disabled)
          </Label>
        </div>
      </div>

      <div className="md:col-span-2">
        <form
          className="border-border bg-card flex items-end gap-3 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const value = String(data.get("email") ?? "").trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              setEmailError("Enter a valid email.");
              toast.error("Form submission failed", {
                description: "Email is invalid.",
              });
              return;
            }
            setEmailError(null);
            toast.success("Form submitted", { description: value });
            form.reset();
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="ks-form-email">Email</Label>
            <Input
              id="ks-form-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? "ks-form-email-msg" : undefined}
              data-testid="kitchen-sink-form-email"
            />
            {emailError ? (
              <p
                id="ks-form-email-msg"
                role="alert"
                className="text-status-danger-foreground text-sm"
              >
                {emailError}
              </p>
            ) : null}
          </div>
          <Button type="submit" data-testid="kitchen-sink-form-submit">
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
}

export function OverlaysDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="kitchen-sink-dialog-trigger">
            Open dialog
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>
              Tab cycles within the dialog (focus trap). Esc closes and returns focus to the
              trigger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="ks-dialog-input">First focusable</Label>
            <Input id="ks-dialog-input" placeholder="Type here to test focus return..." />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Confirm</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" data-testid="kitchen-sink-sheet-trigger">
            Open sheet (right)
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Sheets are reserved for lightweight create/edit forms (CLAUDE.md §5).
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <div className="space-y-2">
              <Label htmlFor="ks-sheet-name">Display name</Label>
              <Input id="ks-sheet-name" defaultValue="Esam Jouda" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ks-sheet-bio">Bio</Label>
              <Textarea id="ks-sheet-bio" rows={4} />
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <SheetClose asChild>
              <Button>Save</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">Open sheet (bottom)</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[60vh]">
          <SheetHeader>
            <SheetTitle>Bottom sheet</SheetTitle>
            <SheetDescription>Mobile-friendly variant for crew flows.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ToastsDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        data-testid="kitchen-sink-toast-success"
        onClick={() =>
          toast.success("Saved", {
            description: "Profile updated successfully.",
          })
        }
      >
        Trigger success
      </Button>
      <Button
        variant="outline"
        data-testid="kitchen-sink-toast-error"
        onClick={() =>
          toast.error("Save failed", {
            description: "Network unreachable. Retry in a moment.",
          })
        }
      >
        Trigger error
      </Button>
      <Button
        variant="outline"
        data-testid="kitchen-sink-toast-queued"
        onClick={() =>
          toast.message("Queued for sync", {
            description: "Will retry automatically when online.",
          })
        }
      >
        Trigger queued
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info("Heads-up", { description: "Just FYI." })}
      >
        Trigger info
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning("Warning", { description: "Action required soon." })}
      >
        Trigger warning
      </Button>
    </div>
  );
}
