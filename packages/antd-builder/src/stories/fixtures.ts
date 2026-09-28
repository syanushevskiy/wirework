/**
 * What the builder's stories are given: the standard contracts, the antd
 * widgets that implement them, one host action, a store with some data to
 * bind to, and a counter already placed on a page — a host's registries in
 * miniature.
 */
import { z } from "zod";
import { createActions, createContracts, createRegistry, type ResolvedCellOk } from "@wirework/engine";
import { createStore } from "@wirework/store";
import { antdWidgets } from "@wirework/antd-widgets";
import { standardContracts } from "@wirework/widget-contracts";
import type { EditableCell } from "@wirework/builder";

export function contracts() {
  const registry = createContracts();
  for (const contract of standardContracts) registry.register(contract);
  return registry;
}

export function registry() {
  const widgets = createRegistry({ contracts: contracts() });
  for (const widget of antdWidgets) widgets.register(widget);
  return widgets;
}

export function actions() {
  const registry = createActions();
  registry.register({
    name: "notify",
    description: "Show a message to the user",
    params: z.object({ text: z.string().describe("What to say") }).strict(),
    handler: () => undefined,
  });
  return registry;
}

/** Store paths the port fields can offer as suggestions. */
export const store = () => createStore({ demo: { count: 3, text: "hello", flag: true } });

/** The antd counter placed on a page, wired to `demo.count`, as an editor finds it. */
export function placedCounter(): EditableCell {
  const definition = antdWidgets.find((widget) => widget.type === "antd-counter");
  if (!definition) throw new Error("antd-counter is not among the antd widgets");
  const viewModel = definition.viewModel.parse({
    inputs: { value: "demo.count" },
    on: { incremented: [{ set: "demo.count", from: "value" }] },
    label: "Hits",
  });
  const cell: ResolvedCellOk = {
    key: "custom-1",
    widget: "antd-counter",
    model: "widgets.custom.custom-1",
    template: "default",
    viewModel,
    definition,
  };
  return { ...cell, definition };
}
