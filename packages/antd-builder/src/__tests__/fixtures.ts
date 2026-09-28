/** The smallest registries the antd builder's components need: a counter widget with a required event and one setting. */
import { z } from "zod";
import { widgetBindingsSchema, type AnyWidgetDefinition, type WidgetEvents, type WidgetIO } from "@wirework/schema";
import { createActions, createContracts, createRegistry, type ResolvedCellOk } from "@wirework/engine";
import type { EditableCell } from "@wirework/builder";

const counterIo = { inputs: { value: { description: "a number", value: z.number(), default: 0 } } } satisfies WidgetIO;
const counterEvents = {
  changed: { description: "next value", payload: z.object({ value: z.number() }), required: true, primary: "value" },
} satisfies WidgetEvents;

export const counter: AnyWidgetDefinition = {
  type: "counter",
  description: "counts clicks",
  io: counterIo,
  events: counterEvents,
  viewModel: widgetBindingsSchema(counterIo, counterEvents).extend({
    label: z.string().default("Count").describe("Shown above the number"),
  }),
  component: () => null,
};

export const registryWith = (...widgets: AnyWidgetDefinition[]) => {
  const registry = createRegistry();
  for (const widget of widgets) registry.register(widget);
  return registry;
};

export const actions = () => createActions();
export const contracts = () => createContracts();

/** The counter as a placed, resolved cell wired to `demo.count`. */
export const placedCounter = (): EditableCell => {
  const cell: ResolvedCellOk = {
    key: "custom-1",
    widget: "counter",
    model: "widgets.custom.custom-1",
    template: "default",
    viewModel: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] }, label: "Count" },
    definition: counter,
  };
  return { ...cell, definition: counter };
};
