/**
 * The FILTERS OF THE TABLE'S OWN, in the bar above it (`filters` in the
 * `table` contract): filters of the LIST, not of a column — always in view,
 * and by a property no column needs to show. The definitions come from the
 * `filters` port when a store path holds them (a server describes them) and
 * otherwise from the setting.
 *
 * They are one choice with the headers (use-table-headers.ts): what is
 * chosen is read from the same three ports, and a change emits the same
 * `filter-changed` with everything chosen. A period of dates is offered
 * only while the `filterBetween` port is bound — as in a header, a choice
 * needs somewhere to live.
 */
import { useMemo } from "react";
import type { PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { NO_DATES, type ColumnFilter, type DateRange, type TableFilter } from "@wirework/widget-contracts";
import type { ColumnChoice, TableHeadersView } from "./use-table-headers";

/** One filter as the bar renders it: the control of the filter row, under a label instead of a column's title. */
export interface ToolbarFilterEntry {
  id: string;
  title: string;
  filter: ColumnFilter;
  values: string[];
  text: string;
  period: DateRange;
  change: (next: ColumnChoice) => void;
}

const NONE: string[] = [];

/** What a definition offers, in the columns' own terms. */
const filterOf = ({ kind, options, time }: TableFilter): ColumnFilter =>
  kind === "values" ? { kind, options } : kind === "dates" && time !== undefined ? { kind, time } : { kind };

export function useToolbarFilters(
  store: ReadableStore,
  path: string | undefined,
  port: PortDefinition<TableFilter[]>,
  configured: TableFilter[],
  { choice, choose, keepsPeriods }: Pick<TableHeadersView, "choice" | "choose" | "keepsPeriods">,
): ToolbarFilterEntry[] {
  const bound = usePort(store, path, port);
  const definitions = bound !== undefined && bound.length > 0 ? bound : configured;
  return useMemo(
    () =>
      definitions
        .filter((definition) => keepsPeriods || definition.kind !== "dates")
        .map((definition) => ({
          id: definition.id,
          title: definition.label ?? definition.id,
          filter: filterOf(definition),
          values: choice.filterIn[definition.id] ?? NONE,
          text: choice.filterLike[definition.id] ?? "",
          period: choice.filterBetween[definition.id] ?? NO_DATES,
          change: (next: ColumnChoice) => choose(definition.id, next),
        })),
    [definitions, choice, choose, keepsPeriods],
  );
}
