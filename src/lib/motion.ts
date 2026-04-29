"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Easing, MotionProps, Variants } from "framer-motion";

/** Re-export `motion` + `AnimatePresence` so feature code routes every
 * framer-motion usage through this module (prompt.md rule 9). Direct
 * `import … from "framer-motion"` outside this file is forbidden. */
export { motion, AnimatePresence };
export type { MotionProps, Variants } from "framer-motion";

/**
 * Canonical motion helpers — prompt.md §2B-E.
 *
 * Feature code MUST route through this module; direct `framer-motion` imports
 * outside this file are forbidden (CLAUDE.md §5 / prompt.md rule 9). Each
 * helper branches on `prefers-reduced-motion` and collapses to a zero-duration
 * no-op when set, satisfying WCAG 2.3.3 and CLAUDE.md §19.
 */

export type MotionDuration = "tactile" | "micro" | "small" | "layout" | "flow";

const DURATION_SECONDS: Record<MotionDuration, number> = {
  // Mirrors CSS `--duration-*` tokens in globals.css.
  //   tactile — button press feedback (130ms)
  //   micro   — icon tweens, hover tints (100ms)
  //   small   — modal chrome, toast enter (200ms)
  //   layout  — section swaps, tab panel change (300ms)
  //   flow    — choreographed layout transitions (450ms)
  tactile: 0.13,
  micro: 0.1,
  small: 0.2,
  layout: 0.3,
  flow: 0.45,
};

// Typed as `Easing | Easing[]` (non-undefined) so strict
// `exactOptionalPropertyTypes` accepts them when spread into a
// `transition: { ease }` property that does not allow `undefined`.
const EASING_STANDARD: Easing | Easing[] = [0.2, 0, 0, 1];
const EASING_EMPHASIZED: Easing | Easing[] = [0.3, 0, 0, 1];
const EASING_EXIT: Easing | Easing[] = [0.3, 0, 1, 1];
// Overshoot spring for pill indicators / layoutId slides.
// Mirrors CSS --ease-spring in globals.css.
const EASING_SPRING: Easing | Easing[] = [0.34, 1.56, 0.64, 1];

export const MOTION_EASINGS = {
  standard: EASING_STANDARD,
  emphasized: EASING_EMPHASIZED,
  exit: EASING_EXIT,
  spring: EASING_SPRING,
} as const;

/** Hook — subscribes to `(prefers-reduced-motion: reduce)` media query. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (event: MediaQueryListEvent): void => setReduced(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

type FadeInOptions = Readonly<{ duration?: MotionDuration }>;
type SlideUpOptions = Readonly<{ duration?: MotionDuration; distance?: number }>;
type StaggerOptions = Readonly<{ delay?: number }>;

/** Fade a single element in. Reduced-motion → opacity set immediately, no tween. */
export function fadeIn(options: FadeInOptions = {}): MotionProps {
  const duration = options.duration ?? "small";
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: DURATION_SECONDS[duration],
      ease: EASING_STANDARD,
    },
  };
}

/** Slide up + fade in. `distance` defaults to 8px, matching 2× --space-1. */
export function slideUp(options: SlideUpOptions = {}): MotionProps {
  const duration = options.duration ?? "small";
  const distance = options.distance ?? 8;
  return {
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance },
    transition: {
      duration: DURATION_SECONDS[duration],
      ease: EASING_EMPHASIZED,
    },
  };
}

type SlideHorizontalOptions = Readonly<{ duration?: MotionDuration; direction: 1 | -1 }>;

/**
 * Slide horizontally + fade. Used for wizard-style forward/back navigation.
 *   `direction:  1` → enters from the right  (forward / "next")
 *   `direction: -1` → enters from the left   (back / "previous")
 * Distance is 24px — a subtle directional hint, not a full panel slide.
 */
export function slideHorizontal(options: SlideHorizontalOptions): MotionProps {
  const duration = options.duration ?? "layout";
  const distance = 24 * options.direction;
  return {
    initial: { opacity: 0, x: distance },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -distance },
    transition: {
      duration: DURATION_SECONDS[duration],
      ease: EASING_EMPHASIZED,
    },
  };
}

/**
 * Stagger children entrance — parent applies `variants={staggerParent}`;
 * each child applies `variants={staggerChild}`. Both are returned together so
 * callers never mismatch them.
 */
export function stagger(options: StaggerOptions = {}): {
  parent: Variants;
  child: Variants;
  parentProps: Pick<MotionProps, "initial" | "animate" | "exit">;
} {
  const delay = options.delay ?? 0.05;
  return {
    parent: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: delay },
      },
    },
    child: {
      hidden: { opacity: 0, y: 6 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION_SECONDS.small, ease: EASING_STANDARD },
      },
    },
    parentProps: {
      initial: "hidden",
      animate: "visible",
    },
  };
}

const REDUCED_MOTION_PROPS: MotionProps = {
  initial: false,
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0 },
};

const REDUCED_MOTION_STAGGER: ReturnType<typeof stagger> = {
  parent: { hidden: { opacity: 1 }, visible: { opacity: 1 } },
  child: { hidden: { opacity: 1 }, visible: { opacity: 1 } },
  parentProps: { initial: false, animate: "visible" },
};

/**
 * Reduced-motion wrapper. Components consuming motion helpers should write:
 *   const reduced = usePrefersReducedMotion();
 *   <motion.div {...motionOrStill(fadeIn({ duration: "small" }), reduced)} />
 * This keeps the branch explicit at the call site.
 */
export function motionOrStill(props: MotionProps, reduced: boolean): MotionProps {
  return reduced ? REDUCED_MOTION_PROPS : props;
}

export function staggerOrStill(
  value: ReturnType<typeof stagger>,
  reduced: boolean,
): ReturnType<typeof stagger> {
  return reduced ? REDUCED_MOTION_STAGGER : value;
}
