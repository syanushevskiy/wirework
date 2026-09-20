/**
 * Filter actions — the logic behind the demo's DEPENDENT multi-selects.
 * Reactions never transform (doc/widget-events-design.md), so "the suites on
 * offer depend on the applications chosen" is host code with a name: the
 * Applications multi-select stores its choice, then calls
 * `filters/sync-suites`, which offers the chosen applications' suites and
 * drops chosen suites that no longer belong. It is synchronous, so both
 * writes land inside the same pick (doc/widget-events-design.md, timing).
 */
import { z } from "zod";
import type { ActionDefinition } from "@wirework/schema";
import type { ChoiceOption } from "@wirework/widget-contracts";

/** Where the action reads and writes the demo's filters. */
const FILTER_PATHS = {
  applications: "filters.applications",
  suiteOptions: "filters.suiteOptions",
  suites: "filters.suites",
} as const;

const stringList = z.array(z.string());

export function createFilterActions(suitesFor: (applications: readonly string[]) => ChoiceOption[]): ActionDefinition[] {
  return [
    {
      name: "filters/sync-suites",
      description: "Offer the suites of the chosen applications (filters.applications); drop chosen suites that no longer belong",
      handler: ({ store }) => {
        const offered = suitesFor(store.getAs(FILTER_PATHS.applications, stringList) ?? []);
        store.set(FILTER_PATHS.suiteOptions, offered);
        const allowed = new Set(offered.map((option) => option.value));
        const chosen = store.getAs(FILTER_PATHS.suites, stringList) ?? [];
        const kept = chosen.filter((suite) => allowed.has(suite));
        if (kept.length !== chosen.length) store.set(FILTER_PATHS.suites, kept);
      },
    },
  ];
}
