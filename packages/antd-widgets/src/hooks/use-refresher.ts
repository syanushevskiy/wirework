/**
 * ALL antd-refresher logic lives here (guidelines: render-only components):
 * the schedule read from the store, the timer, and the two intents —
 * `changed` (a new schedule for the reaction to store) and `refresh`.
 */
import { useCallback, useEffect, useEffectEvent } from "react";
import type { Emit, ReadableStore } from "@wirework/schema";
import { useStorePath } from "@wirework/react";
import { refreshScheduleSchema, type RefreshSchedule } from "@wirework/widget-contracts";
import type { RefresherEvents } from "../widgets/antd-refresher";

export function useRefresher(
  store: ReadableStore,
  emit: Emit<RefresherEvents>,
  paths: { schedule: string; busy?: string },
  fallback: RefreshSchedule,
) {
  // A live store value is not validated; a broken schedule shows the default.
  const parsed = refreshScheduleSchema.safeParse(useStorePath<unknown>(store, paths.schedule));
  const { enabled, interval } = parsed.success ? parsed.data : fallback;
  // The busy port is optional: unbound means never busy.
  const busy = useStorePath<unknown>(store, paths.busy) === true;

  // Reads the latest `busy` without restarting the timer when it flips. A
  // busy or hidden page skips the tick: no pile-up, no background polling.
  const tick = useEffectEvent(() => {
    if (busy || document.hidden) return;
    emit("refresh", { trigger: "interval" });
  });

  // Emits come from the timer callback, never the effect body (StrictMode
  // runs effects twice; the cleanup clears the first timer).
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(tick, interval * 1000);
    return () => clearInterval(timer);
  }, [enabled, interval]);

  const toggle = useCallback(
    (next: boolean) => emit("changed", { enabled: next, interval }),
    [emit, interval],
  );

  // Mid-typing values (empty, 0, 2.5) are not a schedule: keep the stored one.
  const changeInterval = useCallback(
    (next: number | null) => {
      if (!refreshScheduleSchema.shape.interval.safeParse(next).success) return;
      emit("changed", { enabled, interval: next as number });
    },
    [emit, enabled],
  );

  const refresh = useCallback(() => emit("refresh", { trigger: "manual" }), [emit]);

  return { enabled, interval, busy, toggle, changeInterval, refresh };
}
