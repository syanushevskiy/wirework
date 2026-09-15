/**
 * Button — the archetypal INTENT widget: no inputs, no state, one event.
 * What a click DOES is not the button's business: the user wires it in the
 * view model (a `set` reaction or a `call` to a host action) or the host
 * subscribes in code (doc/widget-events-design.md, "Listening").
 * Render-only: logic in useButton.
 */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type WidgetEvents,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useButton } from "../hooks/use-button";

const io = { inputs: {} } satisfies WidgetIO;

const events = {
  clicked: {
    description: "Fired on every click, with the button's caption",
    payload: z.object({ label: z.string() }),
  },
} satisfies WidgetEvents;

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ButtonEvents = typeof events;

const viewModel = widgetBindingsSchema(io, events).extend({
  label: z.string().default("Click me").describe("Button caption"),
});

type VM = z.infer<typeof viewModel>;

function DummyButton({ viewModel, emit }: WidgetProps<VM, ButtonEvents>) {
  const { click } = useButton(emit, viewModel.label);
  return (
    <button type="button" data-testid="dummy-button" onClick={click}>
      {viewModel.label}
    </button>
  );
}

export const dummyButton = defineWidget({
  type: "dummy-button",
  description: "A button that emits `clicked` — wire the click to a reaction or an action",
  io,
  events,
  viewModel,
  component: DummyButton,
});
