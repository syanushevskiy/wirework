/**
 * `refresher` contract — ask for fresh data by hand or every N seconds.
 *
 * The widget OWNS nothing and fetches nothing. Its schedule (auto-refresh
 * on/off + interval) lives at a store path it reads; every user change
 * EMITS `changed` with the whole schedule and the required reaction writes
 * it back (one `set`, no `from`). A Refresh click, or a tick while
 * auto-refresh is on, EMITS `refresh`; the reaction decides WHAT is
 * refreshed — a `call` to a host action (doc/refresher-design.md).
 *
 * Implementations render a checkbox, a number field (seconds) and a
 * button. They tick only while enabled and restart on an interval change;
 * they skip a tick while `busy` is true or the document is hidden (no
 * request pile-up, no background polling); they emit only from a click or
 * the timer callback, never from render or an effect body.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

export const REFRESH_TRIGGERS = ["manual", "interval"] as const;
export type RefreshTrigger = (typeof REFRESH_TRIGGERS)[number];

/** Seconds; below one second is a load test, not a refresh. */
export const REFRESH_INTERVAL = { min: 1, max: 3600, default: 5 } as const;

const intervalSchema = z.number().int().min(REFRESH_INTERVAL.min).max(REFRESH_INTERVAL.max);

export const refreshScheduleSchema = z.object({ enabled: z.boolean(), interval: intervalSchema });
export type RefreshSchedule = z.infer<typeof refreshScheduleSchema>;

export const refresherContract = defineContract({
  kind: "refresher",
  description: "Refresh on demand or every N seconds; emits `refresh` for a reaction to act on",
  io: {
    inputs: {
      schedule: {
        description: "Store path holding the schedule { enabled, interval (seconds) }",
        value: refreshScheduleSchema,
        default: { enabled: false, interval: REFRESH_INTERVAL.default },
      },
      busy: {
        description: "Store path that is true while a refresh is in flight (optional; the button spins, ticks are skipped)",
        value: z.boolean(),
        required: false,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user turns auto-refresh on/off or edits the interval; carries the whole schedule",
      payload: refreshScheduleSchema,
      // The schedule is state the widget shows; without a reaction nothing moves.
      required: true,
    },
    refresh: {
      description: "Fired on a Refresh click and on every tick while auto-refresh is on",
      payload: z.object({ trigger: z.enum(REFRESH_TRIGGERS) }),
      // A refresher that refreshes nothing is a configuration mistake.
      required: true,
    },
  },
  settings: z.object({
    label: z.string().default("Auto-refresh every").describe("Caption of the on/off checkbox"),
    buttonLabel: z.string().default("Refresh").describe("Caption of the manual refresh button"),
  }),
  preview: {
    // Off: a preview shows, it never ticks.
    seed: { preview: { schedule: { enabled: false, interval: 30 } } },
    viewModel: {
      inputs: { schedule: "preview.schedule" },
      on: { changed: [{ set: "preview.schedule" }] },
    },
  },
});
