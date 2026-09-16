/** Minimal registry/engine/widget fixtures shared by the engine suites. */
import { z } from "zod";
import {
  NO_EVENTS,
  widgetBindingsSchema,
  type AnyLayoutEngine,
  type AnyWidgetDefinition,
  type CellBase,
  type PageViewModel,
  type WidgetEvents,
  type WidgetIO,
} from "@wirework/schema";
import { createLayoutEngines, createRegistry } from "../index";

const io = {
  inputs: { value: { description: "a number", value: z.number(), default: 0 } },
} satisfies WidgetIO;

const events = {
  changed: { description: "next value", payload: z.object({ value: z.number() }), required: true, primary: "value" },
} satisfies WidgetEvents;

export const counter: AnyWidgetDefinition = {
  type: "counter",
  io,
  events,
  viewModel: widgetBindingsSchema(io, events).extend({ label: z.string().default("Count") }),
  component: () => null,
};

export const plain: AnyWidgetDefinition = {
  type: "plain",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: widgetBindingsSchema({ inputs: {} }, NO_EVENTS),
  component: () => null,
};

/** A list-of-cells engine: the smallest thing that satisfies the contract. */
interface ListTemplate extends PageViewModel {
  cells: CellBase[];
}

export const listEngine: AnyLayoutEngine = {
  name: "list",
  template: z.object({ engine: z.literal("list"), cells: z.array(z.object({
    id: z.string().min(1),
    widget: z.string().min(1),
    model: z.string().min(1),
    template: z.string().min(1),
  })) }),
  empty: (): ListTemplate => ({ engine: "list", cells: [] }),
  cells: (template: ListTemplate) => template.cells,
  appendCell: (template: ListTemplate, cell: CellBase) => ({ ...template, cells: [...template.cells, cell] }),
  removeCell: (template: ListTemplate, id: string) => ({ ...template, cells: template.cells.filter((cell) => cell.id !== id) }),
  applyChange: (template: ListTemplate) => template,
  renderer: () => null,
};

export const registryWith = (...widgets: AnyWidgetDefinition[]) => {
  const registry = createRegistry();
  for (const widget of widgets) registry.register(widget);
  return registry;
};

export const enginesWith = (...engines: AnyLayoutEngine[]) => {
  const registry = createLayoutEngines();
  for (const engine of engines) registry.register(engine);
  return registry;
};

/** A page holding the given cells, plus the widget templates they point at. */
export const page = (cells: CellBase[], widgets: Record<string, unknown>) => ({
  pages: { demo: { default: { engine: "list", cells } } },
  widgets,
});

export const cell = (overrides: Partial<CellBase> = {}): CellBase => ({
  id: "c1",
  widget: "counter",
  model: "widgets.counter",
  template: "default",
  ...overrides,
});
