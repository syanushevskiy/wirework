/**
 * For a widget that announces its own appearance — a table's `load`: "I am
 * here, fetch my data". Runs `announce` ONCE per mount, in a task of its own:
 *  - effects of one commit run children first, and the page binds its
 *    reactions in an effect: an emit from a widget's effect body would find
 *    nothing subscribed,
 *  - StrictMode mounts, unmounts and mounts again in one go: the unmount
 *    clears the first timer, so `announce` runs once, for the mount that stays.
 * The latest `announce` is the one that runs (a fresh `emit` after a rebind).
 */
import { useEffect, useRef } from "react";

export function useAfterMount(announce: () => void): void {
  const latest = useRef(announce);
  useEffect(() => {
    latest.current = announce;
  });
  useEffect(() => {
    const timer = setTimeout(() => latest.current(), 0);
    return () => clearTimeout(timer);
  }, []);
}
