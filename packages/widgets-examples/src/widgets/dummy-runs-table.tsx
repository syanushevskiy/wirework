/**
 * Runs table — a data-bound table mimicking the Xsight sketch: columns from
 * the view model, rows from the store, keyed by STABLE run id. Clicking a
 * row emits `row-selected` — a row action is an intent, not state, so it
 * travels on the bus and the host decides what it means.
 * Render-only: all logic in useRunsTable.
 */
import { z } from "zod";
import {
  widgetBindingsSchema,
  type RunsData,
  type WidgetEvents,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useRunsTable } from "../hooks/use-runs-table";

const runsDataSchema: z.ZodType<RunsData> = z.object({
  order: z.array(z.string()),
  byId: z.record(
    z.string(),
    z.object({
      id: z.string(),
      name: z.string(),
      reference: z.string(),
      inbound: z.string(),
      status: z.object({ state: z.string(), message: z.string() }),
    }),
  ),
});

/** What the table shows while nothing is at the bound path: no rows. */
const NO_RUNS: RunsData = { order: [], byId: {} };

const io = {
  inputs: {
    data: { description: "RunsData ({ order, byId })", value: runsDataSchema, default: NO_RUNS },
  },
} satisfies WidgetIO;

const events = {
  "row-selected": {
    description: "Fired when the user clicks a run row",
    payload: z.object({ id: z.string() }),
  },
} satisfies WidgetEvents;

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type RunsTableEvents = typeof events;

const columnSchema = z.object({
  name: z.string(),
  /** Dot-path into the run row ("status.state"). */
  property: z.string(),
});

/** Sensible columns for a table added without settings (builder). */
const DEFAULT_COLUMNS: z.infer<typeof columnSchema>[] = [
  { name: "#", property: "id" },
  { name: "Name", property: "name" },
  { name: "Status", property: "status.state" },
];

const viewModel = widgetBindingsSchema(io, events).extend({
  columns: z.array(columnSchema).min(1).default(DEFAULT_COLUMNS),
});

type VM = z.infer<typeof viewModel>;

function DummyRunsTable({ viewModel, store, emit }: WidgetProps<VM, RunsTableEvents>) {
  const { rows, selectRow } = useRunsTable(
    store,
    emit,
    viewModel.inputs.data,
    io.inputs.data.default,
    viewModel.columns,
  );

  return (
    <table data-testid="dummy-runs-table">
      <thead>
        <tr>
          {viewModel.columns.map((column) => (
            <th key={`${column.name}:${column.property}`} scope="col">
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            data-testid="runs-row"
            data-run-id={row.id}
            onClick={() => selectRow(row.id)}
          >
            {row.cells.map(({ column, value }) => (
              <td key={`${column.name}:${column.property}`} data-property={column.property}>
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const dummyRunsTable = defineWidget({
  type: "dummy-runs-table",
  description: "Rows from a RunsData path; emits `row-selected` on click",
  io,
  events,
  viewModel,
  component: DummyRunsTable,
});
