/**
 * Label — static text, or text read from an OPTIONAL input port. The
 * simplest widget with settings: the builder asks for `text` (required)
 * and a `tone` (a design-system role, never a raw colour), and offers the
 * `text` port for wiring to a store path. Render-only: logic in useLabelText.
 */
import { z } from "zod";
import {
  ioBindingsSchema,
  NO_EVENTS,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useLabelText } from "../hooks/use-label-text";

const io = {
  inputs: {
    text: {
      description: "Store path whose value replaces the static text",
      value: z.string(),
      required: false,
    },
  },
} satisfies WidgetIO;

/** Semantic roles mapped to CSS variables (styles.css) — no raw colours in config. */
export const LABEL_TONES = ["default", "muted", "accent", "success", "danger"] as const;

const viewModel = ioBindingsSchema(io).extend({
  text: z.string().describe("Text to display (used when no text input is bound)"),
  tone: z.enum(LABEL_TONES).default("default").describe("Semantic colour role"),
});

type VM = z.infer<typeof viewModel>;

function DummyLabel({ viewModel, store }: WidgetProps<VM, typeof NO_EVENTS>) {
  const text = useLabelText(store, viewModel.inputs.text, viewModel.text);
  return (
    <span
      className="ww-label"
      data-testid="dummy-label"
      data-path={viewModel.inputs.text}
      data-tone={viewModel.tone}
    >
      {text}
    </span>
  );
}

export const dummyLabel = defineWidget({
  type: "dummy-label",
  description: "Static text, or the text at a store path, in a semantic tone",
  io,
  events: NO_EVENTS,
  viewModel,
  component: DummyLabel,
});
