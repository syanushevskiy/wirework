/**
 * The smallest layout engine a story needs for a CONTAINER's content: a
 * list of cells rendered top to bottom. Dev-only — the real engines are
 * packages of their own; a story of a card does not need a grid.
 */
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { createLayoutEngines, createRegistry } from "@wirework/engine";
import { defineLayoutEngine } from "@wirework/react";

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

export const listEngine = defineLayoutEngine<ListTemplate, ListTemplate>({
  name: "list",
  template: listTemplateSchema,
  change: listTemplateSchema,
  empty: () => ({ engine: "list", cells: [] }),
  cells: (template) => template.cells,
  appendCell: (template, cell) => ({ ...template, cells: [...template.cells, cell] }),
  removeCell: (template, id) => ({ ...template, cells: template.cells.filter((cell) => cell.id !== id) }),
  applyChange: (_template, change) => change,
  renderer: function ListRenderer({ cells, renderCell }) {
    return (
      <ul data-testid="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {cells.map((cell) => (
          <li key={cell.key}>{renderCell(cell)}</li>
        ))}
      </ul>
    );
  },
});

/** What a container's layouts resolve against in a story: the given widgets, laid out as a list. */
export function inside(...widgets: AnyWidgetDefinition[]) {
  const registry = createRegistry();
  for (const widget of widgets) registry.register(widget);
  const layoutEngines = createLayoutEngines();
  layoutEngines.register(listEngine);
  return { registry, layoutEngines };
}
