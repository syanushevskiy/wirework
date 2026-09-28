/** The smallest registries a builder needs: a list engine (no renderer) and a counter widget with a required event. */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type AnyLayoutEngine,
  type AnyWidgetDefinition,
  type CellBase,
  type WidgetEvents,
  type WidgetIO,
} from "@wirework/schema";
import { createActions, createContracts, createLayoutEngines, createRegistry } from "@wirework/engine";
import type { EditableTrees } from "../use-commit";

const counterIo = { inputs: { value: { description: "a number", value: z.number(), default: 0 } } } satisfies WidgetIO;
const counterEvents = {
  changed: { description: "next value", payload: z.object({ value: z.number() }), required: true, primary: "value" },
} satisfies WidgetEvents;

export const counter: AnyWidgetDefinition = {
  type: "counter",
  io: counterIo,
  events: counterEvents,
  viewModel: widgetBindingsSchema(counterIo, counterEvents).extend({ label: z.string().default("Count") }),
  component: () => null,
};

const listTemplateSchema = z.object({
  engine: z.literal("list"),
  cells: z.array(
    z.object({
      id: z.string().min(1),
      widget: z.string().min(1),
      model: z.string().min(1),
      template: z.string().min(1),
    }),
  ),
});
type ListTemplate = z.infer<typeof listTemplateSchema>;

/** Its change payload is a whole template: `applyChange` replaces. */
export const listEngine: AnyLayoutEngine = {
  name: "list",
  template: listTemplateSchema,
  change: listTemplateSchema,
  empty: (): ListTemplate => ({ engine: "list", cells: [] }),
  cells: (template: ListTemplate) => template.cells,
  appendCell: (template: ListTemplate, cell: CellBase) => ({ ...template, cells: [...template.cells, cell] }),
  removeCell: (template: ListTemplate, id: string) => ({
    ...template,
    cells: template.cells.filter((cell) => cell.id !== id),
  }),
  applyChange: (_template: ListTemplate, change: ListTemplate) => change,
  renderer: () => null,
};

/** A second engine, so choosing one is observable. */
export const gridEngine: AnyLayoutEngine = {
  ...listEngine,
  name: "grid",
  template: listTemplateSchema.extend({ engine: z.literal("grid") }),
  empty: () => ({ engine: "grid", cells: [] }),
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

export const actions = () => createActions();
export const contracts = () => createContracts();

export const cell = (overrides: Partial<CellBase> = {}): CellBase => ({
  id: "custom-1",
  widget: "counter",
  model: "widgets.custom.custom-1",
  template: "default",
  ...overrides,
});

/** The page "demo" with one placed counter, wired to `demo.count`, as a builder would have left it. */
export const treesWithCounter = (): EditableTrees => ({
  viewModels: {
    pages: { demo: { default: { engine: "list", cells: [cell()] } } },
    widgets: {
      custom: {
        "custom-1": { default: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } } },
      },
    },
  },
  userViewModels: {},
});
