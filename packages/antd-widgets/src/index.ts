/**
 * @wirework/antd-widgets — widgets built on Ant Design, for the playground
 * and for testing the engine.
 *
 * Contract proof: widget code imports @wirework/schema, the @wirework/react
 * adapter, @wirework/widget-contracts, zod and antd ONLY (the adapter itself
 * uses the default store and bus for previews; widget code never touches
 * them). If a widget ever needs engine, store or bus internals, the widget
 * contract has leaked. No widget writes the store — every state change is
 * an emitted event plus a reaction. Label, button, input, pagination,
 * refresher, select, multi-select, filter-bar, tag, checkbox, progress,
 * alert, table, infinite-table, switch, slider, radio-group, rate,
 * statistic, divider, number, date, date-range, descriptions, result,
 * steps, timeline and the containers card, tabs, collapse and dialog
 * IMPLEMENT the standard contracts; counter, echo and crash are demo/test
 * widgets.
 */
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { antdAlert } from "./widgets/antd-alert";
import { antdButton } from "./widgets/antd-button";
import { antdCard } from "./widgets/antd-card";
import { antdCheckbox } from "./widgets/antd-checkbox";
import { antdCollapse } from "./widgets/antd-collapse";
import { antdCounter } from "./widgets/antd-counter";
import { antdCrash } from "./widgets/antd-crash";
import { antdDate } from "./widgets/antd-date";
import { antdDateRange } from "./widgets/antd-date-range";
import { antdDescriptions, createAntdDescriptions, type AntdDescriptionsOptions } from "./widgets/antd-descriptions";
import { antdDialog } from "./widgets/antd-dialog";
import { antdDivider } from "./widgets/antd-divider";
import { antdEcho } from "./widgets/antd-echo";
import { antdFilterBar } from "./widgets/antd-filter-bar";
import { antdInfiniteTable, createAntdInfiniteTable } from "./widgets/antd-infinite-table";
import { antdInput } from "./widgets/antd-input";
import { antdLabel } from "./widgets/antd-label";
import { antdMultiSelect } from "./widgets/antd-multi-select";
import { antdNumber } from "./widgets/antd-number";
import { antdPagination } from "./widgets/antd-pagination";
import { antdProgress } from "./widgets/antd-progress";
import { antdRadioGroup } from "./widgets/antd-radio-group";
import { antdRate } from "./widgets/antd-rate";
import { antdRefresher } from "./widgets/antd-refresher";
import { antdResult } from "./widgets/antd-result";
import { antdSelect } from "./widgets/antd-select";
import { antdSlider } from "./widgets/antd-slider";
import { antdStatistic } from "./widgets/antd-statistic";
import { antdSteps } from "./widgets/antd-steps";
import { antdSwitch } from "./widgets/antd-switch";
import { antdTable, createAntdTable, type AntdTableOptions } from "./widgets/antd-table";
import { antdTabs } from "./widgets/antd-tabs";
import { antdTag } from "./widgets/antd-tag";
import { antdTimeline } from "./widgets/antd-timeline";

export {
  antdAlert,
  antdButton,
  antdCard,
  antdCheckbox,
  antdCollapse,
  antdCounter,
  antdCrash,
  antdDate,
  antdDateRange,
  antdDescriptions,
  antdDialog,
  antdDivider,
  antdEcho,
  antdFilterBar,
  antdInfiniteTable,
  antdInput,
  antdLabel,
  antdMultiSelect,
  antdNumber,
  antdPagination,
  antdProgress,
  antdRadioGroup,
  antdRate,
  antdRefresher,
  antdResult,
  antdSelect,
  antdSlider,
  antdStatistic,
  antdSteps,
  antdSwitch,
  antdTable,
  antdTabs,
  antdTag,
  antdTimeline,
  createAntdDescriptions,
  createAntdInfiniteTable,
  createAntdTable,
};
export type { AntdDescriptionsOptions, AntdTableOptions };
export type { InfiniteTableEvents } from "./widgets/antd-infinite-table";
export type { TableCellProps, TableCellRenderer, TableCellRenderers } from "./hooks/use-table-cell";
export { validate } from "./validation";
export type { ValidationRule, ValidationResult } from "./validation";
export { LABEL_TONES, VALIDATION_RULES } from "@wirework/widget-contracts";
export type { ButtonEvents } from "./widgets/antd-button";
export type { InputEvents } from "./widgets/antd-input";
export type { PaginationEvents } from "./widgets/antd-pagination";
export type { RefresherEvents } from "./widgets/antd-refresher";
export type { CounterEvents } from "./widgets/antd-counter";
export type { TableEvents } from "./widgets/antd-table";
export type { SelectEvents } from "./widgets/antd-select";
export type { CheckboxEvents } from "./widgets/antd-checkbox";
export type { MultiSelectEvents } from "./widgets/antd-multi-select";
export type { FilterBarEvents } from "./widgets/antd-filter-bar";
export type { SwitchEvents } from "./widgets/antd-switch";
export type { SliderEvents } from "./widgets/antd-slider";
export type { RadioGroupEvents } from "./widgets/antd-radio-group";
export type { RateEvents } from "./widgets/antd-rate";
export type { NumberEvents } from "./widgets/antd-number";
export type { DateEvents } from "./widgets/antd-date";
export type { DateRangeEvents } from "./widgets/antd-date-range";
export type { DescriptionsEvents } from "./widgets/antd-descriptions";
export type { ResultEvents } from "./widgets/antd-result";
export type { DialogEvents } from "./widgets/antd-dialog";
export type { StepsEvents } from "./widgets/antd-steps";

export interface AntdWidgetsOptions {
  /** Cell renderers the host's tables — and its descriptions — offer by name (see createAntdTable). */
  tableCells?: AntdTableOptions["cells"];
}

/** Every production widget, for a host to register at once — with the host's own table cells, if any. */
export function createAntdWidgets({ tableCells }: AntdWidgetsOptions = {}): AnyWidgetDefinition[] {
  return [
    antdLabel,
    antdEcho,
    antdFilterBar,
    antdCounter,
    tableCells === undefined ? antdTable : createAntdTable({ cells: tableCells }),
    tableCells === undefined ? antdInfiniteTable : createAntdInfiniteTable({ cells: tableCells }),
    // A fact sheet shows the table's cells: the host's renderers serve it too.
    tableCells === undefined ? antdDescriptions : createAntdDescriptions({ cells: tableCells }),
    antdButton,
    antdInput,
    antdPagination,
    antdRefresher,
    antdSelect,
    antdTag,
    antdCheckbox,
    antdProgress,
    antdAlert,
    antdMultiSelect,
    antdSwitch,
    antdSlider,
    antdRadioGroup,
    antdRate,
    antdStatistic,
    antdDivider,
    antdNumber,
    antdDate,
    antdDateRange,
    antdResult,
    antdSteps,
    antdTimeline,
    antdCard,
    antdTabs,
    antdCollapse,
    antdDialog,
  ];
}

/** Every production widget as it comes, for a host without table cells of its own. */
export const antdWidgets: AnyWidgetDefinition[] = createAntdWidgets();

/**
 * Widgets that exist to TEST a host (a widget that always crashes, proving
 * the error boundary). Register them only in playgrounds and test pages —
 * never let them reach a real user's palette.
 */
export const antdTestWidgets: AnyWidgetDefinition[] = [antdCrash];

/**
 * Deliberately INVALID definitions — for asserting that registration rejects
 * them loudly. Never register these in a real host.
 */
export const brokenWidgets: Record<string, AnyWidgetDefinition> = {
  emptyType: { ...antdLabel, type: "" },
  badCase: { ...antdLabel, type: "Not Kebab Case" },
  duplicateOfLabel: { ...antdEcho, type: "antd-label" },
  noValidator: {
    ...antdLabel,
    type: "no-validator",
    viewModel: undefined as never,
  },
  noIo: {
    ...antdLabel,
    type: "no-io",
    io: undefined as never,
  },
  noEvents: {
    ...antdLabel,
    type: "no-events",
    events: undefined as never,
  },
  badEventName: {
    ...antdLabel,
    type: "bad-event-name",
    events: { "Not Kebab": { payload: z.string() } },
  },
  eventNoPayload: {
    ...antdLabel,
    type: "event-no-payload",
    events: { clicked: {} as never },
  },
};
