/**
 * Fixtures shared by the adapter's suites: the smallest layout engine with a
 * REAL renderer, three widgets (one that reads the store, one that announces
 * its appearance, one that crashes on demand), and the registries/view
 * models a page needs. Rendering nothing fancy — the DOM the tests assert
 * on is what PageView and the engine renderer produce.
 */
import { z } from "zod";
import {
  NO_EVENTS,
  widgetBindingsSchema,
  type AnyWidgetDefinition,
  type CellBase,
  type PageViewModel,
  type ViewModels,
  type WidgetEvents,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { createActions, createLayoutEngines, createRegistry } from "@wirework/engine";
import { defineLayoutEngine } from "../layout";
import { useAfterMount } from "../useAfterMount";
import { useStorePath } from "../useStorePath";

/** A list of cells, rendered top to bottom — with a switch that makes the renderer throw. */
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
  crash: z.boolean().optional(),
});
export type ListTemplate = z.infer<typeof listTemplateSchema>;

export const listEngine = defineLayoutEngine<ListTemplate, ListTemplate>({
  name: "list",
  template: listTemplateSchema,
  change: listTemplateSchema,
  empty: () => ({ engine: "list", cells: [] }),
  cells: (template) => template.cells,
  appendCell: (template, cell) => ({ ...template, cells: [...template.cells, cell] }),
  removeCell: (template, id) => ({ ...template, cells: template.cells.filter((cell) => cell.id !== id) }),
  applyChange: (_template, change) => change,
  renderer: function ListRenderer({ template, cells, renderCell, renderChrome }) {
    if (template.crash === true) throw new Error("the list is broken");
    return (
      <ul data-testid="list">
        {cells.map((cell) => (
          <li key={cell.key} data-testid="list-item" data-cell={cell.key}>
            {renderChrome?.(cell)}
            {renderCell(cell)}
          </li>
        ))}
      </ul>
    );
  },
});

const echoIo = { inputs: { value: { value: z.string(), default: "nothing" } } } satisfies WidgetIO;

/** Shows the string at its `value` port. */
export const echo: AnyWidgetDefinition = {
  type: "echo",
  io: echoIo,
  events: NO_EVENTS,
  viewModel: widgetBindingsSchema(echoIo, NO_EVENTS),
  component: function Echo({ viewModel, store }: WidgetProps<{ inputs: { value: string } }>) {
    const value = useStorePath<string>(store, viewModel.inputs.value);
    return <span data-testid="echo">{value ?? "nothing"}</span>;
  },
};

const announcerEvents = {
  load: { description: "the widget appeared", payload: z.object({}) },
} satisfies WidgetEvents;

/** Announces its appearance with `load`, the way a table does. */
export const announcer: AnyWidgetDefinition = {
  type: "announcer",
  io: { inputs: {} },
  events: announcerEvents,
  viewModel: widgetBindingsSchema({ inputs: {} }, announcerEvents),
  component: function Announcer({ emit }: WidgetProps<unknown, typeof announcerEvents>) {
    useAfterMount(() => emit("load", {}));
    return <span data-testid="announcer">here</span>;
  },
};

const crasherSchema = widgetBindingsSchema({ inputs: {} }, NO_EVENTS).extend({ crash: z.boolean().default(false) });

/** Throws while rendering when its `crash` setting is on. */
export const crasher: AnyWidgetDefinition = {
  type: "crasher",
  io: { inputs: {} },
  events: NO_EVENTS,
  viewModel: crasherSchema,
  component: function Crasher({ viewModel }: WidgetProps<z.infer<typeof crasherSchema>>) {
    if (viewModel.crash) throw new Error("the widget is broken");
    return <span data-testid="crasher">fine</span>;
  },
};

export const registryWith = (...widgets: AnyWidgetDefinition[]) => {
  const registry = createRegistry();
  for (const widget of widgets) registry.register(widget);
  return registry;
};

export const layoutEngines = () => {
  const registry = createLayoutEngines();
  registry.register(listEngine);
  return registry;
};

export const actions = () => createActions();

export const cell = (overrides: Partial<CellBase> = {}): CellBase => ({
  id: "c1",
  widget: "echo",
  model: "widgets.echo",
  template: "default",
  ...overrides,
});

/** The page "demo" holding the given cells, the widget templates they point at, and the page's own reactions. */
export function viewModels(
  cells: CellBase[],
  widgets: Record<string, unknown>,
  on: ViewModels["on"] = {},
  page: Partial<PageViewModel> = {},
): ViewModels {
  return { pages: { demo: { default: { engine: "list", cells, ...page } } }, widgets, on };
}
