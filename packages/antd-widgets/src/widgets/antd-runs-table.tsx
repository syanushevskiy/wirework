/**
 * Runs table — a data-bound antd Table mimicking the Xsight sketch: columns
 * from the view model, rows from the store, keyed by STABLE run id.
 * Clicking a row emits `row-selected` — a row action is an intent, not
 * state, so it travels on the bus and the host decides what it means.
 * Paging is not the table's job: a pagination widget and a host action
 * replace the rows at the bound path, and `loading` covers the wait.
 * Render-only: all logic in useRunsTable.
 */
import { Table } from "antd";
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
    loading: {
      description: "Whether rows are being fetched (optional; shows a spinner over the rows)",
      value: z.boolean(),
      required: false,
      default: false,
    },
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

function AntdRunsTable({ viewModel, store, emit }: WidgetProps<VM, RunsTableEvents>) {
  const { columns, rows, loading, rowProps } = useRunsTable(
    store,
    emit,
    { data: viewModel.inputs.data, loading: viewModel.inputs.loading },
    io.inputs,
    viewModel.columns,
  );

  return (
    <div className="ww-runs-table" data-testid="antd-runs-table" data-loading={loading}>
      <Table
        size="small"
        pagination={false}
        loading={loading}
        columns={columns}
        dataSource={rows}
        onRow={rowProps}
      />
    </div>
  );
}

export const antdRunsTable = defineWidget({
  type: "antd-runs-table",
  description: "Rows from a RunsData path; emits `row-selected` on click",
  preview: {
    seed: {
      preview: {
        runs: {
          order: ["1", "2"],
          byId: {
            "1": { id: "1", name: "Nightly", reference: "REF-1", inbound: "IN-1", status: { state: "Success", message: "ok" } },
            "2": { id: "2", name: "Smoke", reference: "REF-2", inbound: "IN-2", status: { state: "Failed", message: "boom" } },
          },
        },
      },
    },
    viewModel: { inputs: { data: "preview.runs" } },
  },
  io,
  events,
  viewModel,
  component: AntdRunsTable,
});
