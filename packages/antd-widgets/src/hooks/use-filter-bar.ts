/** ALL antd-filter-bar logic lives here (guidelines: render-only components). */
import { useCallback, useId, useMemo } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { FilterDefinition, FilterValues } from "@wirework/widget-contracts";
import type { FilterBarEvents } from "../widgets/antd-filter-bar";

const NO_FILTERS: FilterDefinition[] = [];
const NOTHING_CHOSEN: FilterValues = {};
const NONE: string[] = [];

/** One filter as it is rendered. */
export interface RenderedFilter {
  id: string;
  /** DOM id tying the visible label to the combobox. */
  fieldId: string;
  label: string;
  options: { value: string; label: string; disabled?: boolean | undefined }[];
  values: string[];
  /** For tests and inspection. */
  chosenAttribute: string;
  offeredAttribute: string;
}

export function useFilterBar(
  store: ReadableStore,
  emit: Emit<FilterBarEvents>,
  paths: { filters: string; value: string },
  ports: { filters: PortDefinition<FilterDefinition[]>; value: PortDefinition<FilterValues> },
) {
  const baseId = useId();
  // Validated by the contract's ports: a malformed value shows no filters, never a crash.
  const definitions = usePort(store, paths.filters, ports.filters) ?? NO_FILTERS;
  const chosen = usePort(store, paths.value, ports.value) ?? NOTHING_CHOSEN;

  const filters = useMemo<RenderedFilter[]>(
    () =>
      definitions.map((definition) => {
        const options = definition.options.map(({ value, label, disabled }) => ({
          value,
          label: label ?? value,
          disabled,
        }));
        const values = chosen[definition.id] ?? NONE;
        return {
          id: definition.id,
          fieldId: `${baseId}-${definition.id}`,
          label: definition.label ?? definition.id,
          options,
          values,
          chosenAttribute: values.join(","),
          offeredAttribute: options.map((option) => option.label).join(", "),
        };
      }),
    [definitions, chosen, baseId],
  );

  // The widget only EMITS everything chosen; the view model's reaction stores
  // it. A filter with nothing chosen is left out, and so is a choice for a
  // filter that is no longer on offer — the object can go into a request as it is.
  const change = useCallback(
    (id: string, next: string[]) => {
      const offered = new Set(definitions.map((definition) => definition.id));
      const value = Object.fromEntries(
        Object.entries({ ...chosen, [id]: next }).filter(([key, values]) => offered.has(key) && values.length > 0),
      );
      emit("changed", { value });
    },
    [definitions, chosen, emit],
  );

  return { filters, change, idsAttribute: filters.map((filter) => filter.id).join(",") };
}
