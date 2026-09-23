/**
 * The DEMO's host-side event subscription — this application's own wiring,
 * not the builder's and not the engine's.
 *
 * A row click is an INTENT on the bus; the host turns it into STATE
 * ("runs.selected") that any widget can display. The payload is typed by the
 * widget's declaration — no cast. Scoped to the runs page's table: the table
 * is generic, and a table added in the builder must not change the selected
 * run.
 *
 * It lives apart from `usePlayground` because it is the one place that knows
 * a CONCRETE widget (`antdTable`) and concrete page and cell names — exactly
 * what a reusable builder must never know.
 */
import { eventFilter, type EventBus, type Store } from "@wirework/schema";
import { useWidgetEvent } from "@wirework/react";
import { antdTable } from "@wirework/antd-widgets";

export function useDemoBridge(bus: EventBus, store: Store): void {
  useWidgetEvent(bus, eventFilter(antdTable, "row-selected", { page: "runs", cell: "table-main" }), (event) =>
    store.set("runs.selected", event.payload.key),
  );
}
