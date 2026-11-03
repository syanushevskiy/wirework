/**
 * useShowing — whether a conditional widget is on the page RIGHT NOW, its
 * animations included (doc/conditions-design.md, "Appearance"). Shown, it
 * mounts and plays `appear`; hidden, it plays `disappear` and leaves when
 * that ends — so it stays MOUNTED for the length of the animation, and is
 * gone at once without one, or when the person asked their system for
 * less motion (the stylesheet then plays nothing, and no end would come).
 */
import { useCallback, useState } from "react";
import type { Appearance } from "@wirework/schema";

export interface Showing {
  /** Whether the widget is in the DOM: shown, or on its way out. */
  mounted: boolean;
  /** The animation playing, if one: the appearance forward, or the disappearance in reverse. */
  animation: Appearance | undefined;
  leaving: boolean;
  /** The element's `animationend`: the way out is over. */
  onEnd: () => void;
}

const reducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useShowing(shown: boolean, appear: Appearance | undefined, disappear: Appearance | undefined): Showing {
  const [leaving, setLeaving] = useState(false);
  // State derived from a changed prop, set during render as React has it:
  // hidden now with a disappearance to play, it is on its way out until the
  // animation ends; shown again before that, it stays.
  const [wasShown, setWasShown] = useState(shown);
  if (shown !== wasShown) {
    setWasShown(shown);
    setLeaving(!shown && disappear !== undefined && !reducedMotion());
  }
  const onEnd = useCallback(() => setLeaving(false), []);
  const mounted = shown || leaving;
  return {
    mounted,
    animation: !mounted ? undefined : shown ? appear : disappear,
    leaving: mounted && !shown,
    onEnd,
  };
}
