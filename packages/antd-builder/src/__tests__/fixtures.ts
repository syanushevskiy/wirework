/** The smallest registries the antd builder's components need: a counter widget with a required event and one setting, a list engine. */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type AnyLayoutEngine,
  type AnyWidgetDefinition,
  type CellBase,
  type WidgetEvents,
  type WidgetIO,
} from "@wirework/schema";
import {
  createActions,
  createContracts,
  createLayoutEngines,
  createRegistry,
  type ResolvedCellOk,
} from "@wirework/engine";
import type { EditableCell, EditableTrees } from "@wirework/builder";

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

/** A CONTROLLED widget: `turned` writes the new level back to `value` by default. */
const dialEvents = {
  turned: {
    description: "the new level",
    payload: z.object({ value: z.number() }),
    primary: "value",
    writesBack: "value",
  },
} satisfies WidgetEvents;

export const dial: AnyWidgetDefinition = {
  type: "dial",
  description: "a level to turn",
  io: counterIo,
  events: dialEvents,
  viewModel: widgetBindingsSchema(counterIo, dialEvents).extend({ label: z.string().default("Level") }),
  component: () => null,
};

export const registryWith = (...widgets: AnyWidgetDefinition[]) => {
  const registry = createRegistry();
  for (const widget of widgets) registry.register(widget);
  return registry;
};

export const actions = () => createActions();
export const contracts = () => createContracts();

const listTemplateSchema = z.object({
  engine: z.literal("list"),
  cells: z.array(z.object({ id: z.string().min(1), widget: z.string(), model: z.string(), template: z.string() })),
});
type ListTemplate = z.infer<typeof listTemplateSchema>;

/** A layout engine with no renderer: enough for views, which never render a page. */
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

export const layoutEngines = () => {
  const registry = createLayoutEngines();
  registry.register(listEngine);
  return registry;
};

/** The page "demo": a prebuilt "default" and "compact", and the user's own "mine", which is shown. */
export const treesWithViews = (): EditableTrees => ({
  viewModels: {
    pages: {
      demo: {
        default: { engine: "list", cells: [{ id: "c1", widget: "counter", model: "widgets.c1", template: "default" }] },
        compact: { engine: "list", cells: [] },
      },
    },
    widgets: { c1: { default: { inputs: { value: "demo.count" }, on: { changed: [{ set: "demo.count" }] } } } },
  },
  userViewModels: { pages: { demo: { view: "mine", templates: { mine: { engine: "list", cells: [] } } } } },
});

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
