"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  fadeIn,
  motionOrStill,
  slideUp,
  stagger,
  staggerOrStill,
  usePrefersReducedMotion,
} from "@/lib/motion";

export function MotionDemo() {
  const systemReduced = usePrefersReducedMotion();
  const [override, setOverride] = React.useState(false);
  const reduced = systemReduced || override;
  const [pulse, setPulse] = React.useState(0);

  const fade = motionOrStill(fadeIn({ duration: "small" }), reduced);
  const slide = motionOrStill(slideUp({ duration: "layout", distance: 16 }), reduced);
  const staggerPreset = staggerOrStill(stagger({ delay: 0.08 }), reduced);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          data-testid="kitchen-sink-motion-replay"
          onClick={() => setPulse((p) => p + 1)}
        >
          Replay animations
        </Button>
        <label className="text-foreground-muted inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={override}
            onChange={(event) => setOverride(event.currentTarget.checked)}
            data-testid="kitchen-sink-motion-reduce"
            className="accent-brand-primary size-4"
          />
          Force reduced motion
        </label>
        <span className="text-foreground-subtle text-xs">
          System preference: {systemReduced ? "reduce" : "no-preference"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-foreground-subtle mb-2 text-xs tracking-wider uppercase">fadeIn</p>
          <motion.div
            key={`fade-${pulse}-${reduced}`}
            {...fade}
            className="bg-brand-primary/10 text-brand-primary rounded-md px-3 py-6 text-center text-sm font-medium"
          >
            200ms standard easing
          </motion.div>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-foreground-subtle mb-2 text-xs tracking-wider uppercase">slideUp</p>
          <motion.div
            key={`slide-${pulse}-${reduced}`}
            {...slide}
            className="bg-status-accent-soft text-status-accent-foreground rounded-md px-3 py-6 text-center text-sm font-medium"
          >
            300ms emphasized
          </motion.div>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-foreground-subtle mb-2 text-xs tracking-wider uppercase">stagger</p>
          <motion.ul
            key={`stagger-${pulse}-${reduced}`}
            variants={staggerPreset.parent}
            {...staggerPreset.parentProps}
            className="flex flex-col gap-2"
          >
            {["Alpha", "Bravo", "Charlie", "Delta"].map((label) => (
              <motion.li
                key={label}
                variants={staggerPreset.child}
                className="bg-surface text-foreground rounded-md px-3 py-2 text-sm"
              >
                {label}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
      <p className="text-foreground-subtle text-xs">
        With reduced motion active, every tween collapses to opacity-only with 0ms duration (WCAG
        2.3.3). Toggle the checkbox or set your OS preference to observe the branch.
      </p>
    </div>
  );
}
