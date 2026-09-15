/**
 * Text input — a CONTROLLED field: its text lives in the store (input port
 * `value`), every keystroke EMITS `changed` with the text and its validity,
 * and a reaction writes the text back (that is why `changed` is required).
 * Validation is a premade rule (select) and/or a custom regular expression
 * from the view model (validation.ts). Render-only: logic in useInput.
 */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type WidgetEvents,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useInput } from "../hooks/use-input";
import { VALIDATION_RULES } from "../validation";

const io = {
  inputs: {
    value: { description: "Store path holding the current text", value: z.string(), default: "" },
  },
} satisfies WidgetIO;

const events = {
  changed: {
    description: "Fired on every keystroke with the text and whether it is valid",
    payload: z.object({
      value: z.string(),
      valid: z.boolean(),
      message: z.string().optional(),
    }),
    required: true,
    primary: "value",
  },
} satisfies WidgetEvents;

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type InputEvents = typeof events;

const viewModel = widgetBindingsSchema(io, events).extend({
  label: z.string().default("Text").describe("Field label"),
  placeholder: z.string().optional().describe("Placeholder text"),
  type: z.enum(["text", "email", "number", "password"]).default("text").describe("HTML input type"),
  validation: z.enum(VALIDATION_RULES).default("none").describe("Premade validation rule"),
  pattern: z.string().optional().describe("Custom rule: a regular expression the text must match"),
  patternMessage: z.string().optional().describe("Message shown when the custom rule fails"),
});

type VM = z.infer<typeof viewModel>;

function DummyInput({ viewModel, store, emit }: WidgetProps<VM, InputEvents>) {
  const { value, valid, message, change } = useInput(
    store,
    emit,
    viewModel.inputs.value,
    io.inputs.value.default,
    viewModel,
  );
  return (
    <label data-testid="dummy-input-field">
      <span>{viewModel.label}</span>
      <input
        type={viewModel.type}
        data-testid="dummy-input"
        data-path={viewModel.inputs.value}
        data-valid={valid}
        aria-invalid={!valid}
        placeholder={viewModel.placeholder}
        value={value}
        onChange={(event) => change(event.target.value)}
      />
      {message ? (
        <span role="alert" data-testid="dummy-input-message">
          {message}
        </span>
      ) : null}
    </label>
  );
}

export const dummyInput = defineWidget({
  type: "dummy-input",
  description: "A validated text field; emits every change with the text and its validity",
  io,
  events,
  viewModel,
  component: DummyInput,
});
