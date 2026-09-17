/**
 * ALL antd-refresher logic lives here (guidelines: render-only components):
 * the schedule read from the store, the timer, and the two intents —
 * `changed` (a new schedule for the reaction to store) and `refresh`.
 */
import { useCallback, useEffect, useEffectEvent } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { REFRESH_INTERVAL, refreshScheduleSchema, type RefreshSchedule } from "@wirework/widget-contracts";
import type { RefresherEvents } from "../widgets/antd-refresher";

export function useRefresher(
  store: ReadableStore,
  emit: Emit<RefresherEvents>,
  paths: { schedule: string; busy?: string },
  ports: { schedule: PortDefinition<RefreshSchedule>; busy: PortDefinition<boolean> },
) {
  // Validated by the contract's port: a broken schedule shows the default.
  const { enabled, interval } = usePort(store, paths.schedule, ports.schedule) ?? {
    enabled: false,
    interval: REFRESH_INTERVAL.default,
  };
  // The busy port is optional: unbound means never busy.
  const busy = usePort(store, paths.busy, ports.busy) === true;

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
      const parsed = refreshScheduleSchema.shape.interval.safeParse(next);
      if (parsed.success) emit("changed", { enabled, interval: parsed.data });
    },
    [emit, enabled],
  );

  const refresh = useCallback(() => emit("refresh", { trigger: "manual" }), [emit]);

  return { enabled, interval, busy, toggle, changeInterval, refresh };
}
