/**
 * The ONE deferral behind every "announce yourself" hook (a widget's `load`,
 * the page's `load`): `announce` runs in a task of its own after the commit
 * that changed `signals`, because
 *  - effects of one commit run children first, and the page binds its
 *    reactions in an effect: an emit from an effect's body could find
 *    nothing subscribed,
 *  - StrictMode mounts, unmounts and mounts again in one go: the unmount
 *    clears the first timer, so it runs once, for the mount that stays.
 * The LATEST `announce` runs (a fresh `emit` after a rebind), and nothing
 * runs for a component gone before its turn.
 */
import { createContext, useEffect, useRef } from "react";

/**
 * What the host asked the page to do — load again, IN PLACE: every
 * announcement under the page repeats when it changes, and the page's own
 * follows them (children's effects run first), exactly as on a first mount.
 * Nothing remounts, so widgets keep their state.
 */
export const PageReloadContext = createContext<string | number | undefined>(undefined);

export function useAnnounce(announce: () => void, signals: readonly unknown[]): void {
  const latest = useRef(announce);
  useEffect(() => {
    latest.current = announce;
  });
  useEffect(() => {
    const timer = setTimeout(() => latest.current(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller's signals ARE the dependencies: a new visit, a reload
  }, signals);
}
