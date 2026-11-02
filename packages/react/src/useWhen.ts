/**
 * useWhen — whether a cell's condition holds RIGHT NOW (doc/conditions-design.md).
 * One `useSyncExternalStore` subscribed to every path the condition reads,
 * whose snapshot is the answer itself: "shown", "hidden", or the message
 * of a predicate that threw — a host bug, which the cell shows as a crash
 * and this hook REPORTS once per error through `onError`, never a page
 * down. Without a condition the cell is shown and nothing is subscribed.
 */
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReadableStore, When } from "@wirework/schema";
import { errorText, holds, whenPaths, whenText, type PredicateRegistry } from "@wirework/engine";
import type { OnError } from "./WidgetErrorBoundary";

export interface WhenState {
  shown: boolean;
  /** A predicate threw: the cell shows a crash. */
  error?: Error;
  /** The condition in words ("unless run.error is empty"); absent without a condition. */
  text?: string;
}

export interface WhenOptions {
  /** The predicates the condition may name; the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** Told once per predicate that threw, like a crashing widget. */
  onError?: OnError | undefined;
}

const SHOWN = "shown";
const HIDDEN = "hidden";
const ERROR = "error:";

export function useWhen(
  store: ReadableStore,
  when: When | undefined,
  { predicates, onError }: WhenOptions = {},
): WhenState {
  const paths = useMemo(() => whenPaths(when, predicates), [when, predicates]);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribes = paths.map((path) => store.subscribe(path, onStoreChange));
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
    [store, paths],
  );
  // A string snapshot: equal by value, so an unchanged answer re-renders nothing.
  const getSnapshot = useCallback((): string => {
    if (when === undefined) return SHOWN;
    try {
      return holds(when, (path) => store.get(path), predicates) ? SHOWN : HIDDEN;
    } catch (error) {
      return `${ERROR}${errorText(error)}`;
    }
  }, [store, when, predicates]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const state = useMemo<WhenState>(
    () => ({
      shown: snapshot === SHOWN,
      ...(snapshot.startsWith(ERROR) ? { error: new Error(snapshot.slice(ERROR.length)) } : {}),
      ...(when === undefined ? {} : { text: whenText(when, predicates) }),
    }),
    [snapshot, when, predicates],
  );

  // Once per occurrence, whatever else re-renders the cell: the host's
  // callback may be a fresh function every render, and so may the condition
  // object. A cell that recovered reports the next error anew.
  const reported = useRef(false);
  const { error } = state;
  useEffect(() => {
    if (error === undefined) {
      reported.current = false;
      return;
    }
    if (reported.current) return;
    reported.current = true;
    onError?.(error, {});
  }, [snapshot, error, onError]);

  return state;
}
