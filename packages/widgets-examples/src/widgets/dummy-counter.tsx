/** Counter — reads its value from an input port and EMITS the next value;
 *  the view model's reaction writes it to the store (widgets never write).
 *  Proves the widget -> bus -> reaction -> store -> widget loop.
 *  Render-only: all logic in useCounter. */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type WidgetEvents,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useCounter } from "../hooks/use-counter";

const io = {
  inputs: {
    value: { description: "Number to display and increment", value: z.number(), default: 0 },
  },
} satisfies WidgetIO;

const events = {
  incremented: {
    description: "The next value; bind a reaction to store it",
    payload: z.object({ value: z.number() }),
    // State others depend on: a reaction MUST write it somewhere.
    required: true,
    primary: "value",
  },
} satisfies WidgetEvents;

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type CounterEvents = typeof events;

const viewModel = widgetBindingsSchema(io, events).extend({
  step: z.number().default(1),
  label: z.string().default("Increment"),
});

type VM = z.infer<typeof viewModel>;

function DummyCounter({ viewModel, store, emit }: WidgetProps<VM, CounterEvents>) {
  const { value, increment } = useCounter(
    store,
    emit,
    viewModel.inputs.value,
    viewModel.step,
    io.inputs.value.default,
  );
  return (
    <button
      type="button"
      data-testid="dummy-counter"
      data-path={viewModel.inputs.value}
      onClick={increment}
    >
      {viewModel.label} ({value})
    </button>
  );
}

export const dummyCounter = defineWidget({
  type: "dummy-counter",
  description: "Shows a number and emits the next value on click",
  io,
  events,
  viewModel,
  component: DummyCounter,
});
