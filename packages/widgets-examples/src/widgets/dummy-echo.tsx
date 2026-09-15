/** Echo — subscribes to a store path and renders whatever lives there.
 *  Render-only: all logic in useEchoValue. */
import { z } from "zod";
import {
  ioBindingsSchema,
  NO_EVENTS,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useEchoValue } from "../hooks/use-echo-value";

const io = {
  inputs: {
    value: { description: "Value to display", value: z.unknown() },
  },
} satisfies WidgetIO;

const viewModel = ioBindingsSchema(io).extend({
  label: z.string().optional(),
});

type VM = z.infer<typeof viewModel>;

function DummyEcho({ viewModel, store }: WidgetProps<VM, typeof NO_EVENTS>) {
  const display = useEchoValue(store, viewModel.inputs.value);
  return (
    <div data-testid="dummy-echo" data-path={viewModel.inputs.value}>
      {viewModel.label ? <strong>{viewModel.label}: </strong> : null}
      <output data-testid="dummy-echo-value">{display}</output>
    </div>
  );
}

export const dummyEcho = defineWidget({
  type: "dummy-echo",
  description: "Shows whatever lives at a store path, as JSON (∅ when nothing does)",
  io,
  events: NO_EVENTS,
  viewModel,
  component: DummyEcho,
});
