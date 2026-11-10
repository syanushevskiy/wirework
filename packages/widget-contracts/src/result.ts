/**
 * `result` contract — an OUTCOME, large: what happened (a status picture),
 * a title, a line of detail and, optionally, one action to take next. The
 * face of "there is no such run", "the request failed — Retry", "saved":
 * placed under a `when` like any widget (doc/conditions-design.md), it
 * knows nothing about requests.
 *
 * Display with one intent: the action button EMITS `clicked` with its
 * label. The texts at the optional `title` / `detail` ports replace the
 * static ones (an empty value shows the static text). Implementations
 * render role=status — role=alert for `error`, `forbidden` and `failed`,
 * so a failing page is announced — and expose the status as `data-status`.
 */
import { z } from "zod";
import { defineContract } from "@wirework/schema";

/** Outcomes by their meaning: antd's 404 / 403 / 500 pictures are `not-found`, `forbidden`, `failed`. */
export const RESULT_STATUSES = ["success", "error", "info", "warning", "not-found", "forbidden", "failed"] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export const resultContract = defineContract({
  kind: "result",
  description: "An outcome: a status picture, a title, a detail and one action to take next",
  io: {
    inputs: {
      title: {
        description: "Store path whose value replaces the static title (an empty value shows the static title)",
        value: z.string(),
        required: false,
      },
      detail: {
        description: "Store path whose value replaces the static detail (an empty value shows the static detail)",
        value: z.string(),
        required: false,
      },
    },
  },
  events: {
    clicked: {
      description: "Fired when the action is pressed, with its label",
      payload: z.object({ label: z.string() }),
    },
  },
  settings: z.object({
    status: z.enum(RESULT_STATUSES).default("info").describe("What happened"),
    title: z.string().default("Done").describe("Title while no title input is bound, or it is empty"),
    detail: z.string().optional().describe("A line of detail while no detail input is bound, or it is empty"),
    action: z.string().optional().describe("Caption of the one action to take next; none when absent"),
  }),
  preview: {
    viewModel: { status: "success", title: "Saved", detail: "Every change is stored.", action: "Back" },
  },
});
