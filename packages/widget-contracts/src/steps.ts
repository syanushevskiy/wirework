/**
 * `steps` contract — a PIPELINE: named steps in order, one of them current.
 *
 * The current step lives at the `current` port — its position (from 0) or
 * its key —, the optional `failed` port says the current step went wrong
 * (shown as an error). The steps are a NAMED LIST setting (`items`, each
 * a `key` and a `label`), which a builder adds, names and removes like a
 * tabs widget's tabs. With `clickable` a step the user clicks EMITS
 * `changed` with its key, written back by the default reaction.
 * Implementations render a list named by `label` with one item per step,
 * `aria-current="step"` on the current one, and expose it as
 * `data-current`.
 */
import { z } from "zod";
import { defineContract, PATH_SEGMENT } from "@wirework/schema";

export const stepItemSchema = z
  .object({
    key: z.string().regex(PATH_SEGMENT, "A key is one path segment"),
    label: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();
export type StepItem = z.infer<typeof stepItemSchema>;

export const STEPS_DIRECTIONS = ["horizontal", "vertical"] as const;
export type StepsDirection = (typeof STEPS_DIRECTIONS)[number];

export const stepsContract = defineContract({
  kind: "steps",
  description: "A pipeline of named steps with one current; a clicked step emits its key",
  io: {
    inputs: {
      current: {
        description: "Store path holding the current step: its position from 0, or its key",
        value: z.union([z.number().int().min(0), z.string()]),
        default: 0,
      },
      failed: {
        description: "Store path holding whether the current step failed",
        value: z.boolean(),
        required: false,
      },
    },
  },
  events: {
    changed: {
      description: "Fired when the user clicks a step (with `clickable`), with its key",
      payload: z.object({ current: z.string() }),
      primary: "current",
      writesBack: "current",
    },
  },
  settings: z.object({
    label: z.string().default("Steps").describe("Caption, also the accessible name"),
    items: z
      .array(stepItemSchema)
      .min(1)
      .default([
        { key: "first", label: "First" },
        { key: "second", label: "Second" },
      ])
      .describe("The steps, in order"),
    direction: z.enum(STEPS_DIRECTIONS).default("horizontal").describe("Side by side, or stacked"),
    small: z.boolean().default(true).describe("The compact size"),
    clickable: z.boolean().default(false).describe("Let the user pick a step by clicking it"),
  }),
  preview: {
    seed: { preview: { stage: "running" } },
    viewModel: {
      inputs: { current: "preview.stage" },
      label: "Pipeline",
      items: [
        { key: "queued", label: "Queued" },
        { key: "running", label: "Running" },
        { key: "finished", label: "Finished" },
      ],
    },
  },
});
