/**
 * @wirework/antd-widgets — widgets built on Ant Design, for the playground
 * and for testing the engine.
 *
 * Contract proof: this package depends on @wirework/schema, the
 * @wirework/react adapter, @wirework/widget-contracts and antd ONLY. If a
 * widget ever needs engine, store or bus internals, the widget contract
 * has leaked. No widget writes the store — every state change is an
 * emitted event plus a reaction. Label, button and input IMPLEMENT the
 * standard contracts; the others are demo/domain widgets.
 */
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { antdButton } from "./widgets/antd-button";
import { antdCounter } from "./widgets/antd-counter";
import { antdCrash } from "./widgets/antd-crash";
import { antdEcho } from "./widgets/antd-echo";
import { antdInput } from "./widgets/antd-input";
import { antdLabel } from "./widgets/antd-label";
import { antdPagination } from "./widgets/antd-pagination";
import { antdRunsTable } from "./widgets/antd-runs-table";

export { antdButton, antdCounter, antdCrash, antdEcho, antdInput, antdLabel, antdPagination, antdRunsTable };
export { validate } from "./validation";
export type { ValidationRule, ValidationResult } from "./validation";
export { LABEL_TONES, VALIDATION_RULES } from "@wirework/widget-contracts";
export type { ButtonEvents } from "./widgets/antd-button";
export type { InputEvents } from "./widgets/antd-input";
export type { PaginationEvents } from "./widgets/antd-pagination";
export type { CounterEvents } from "./widgets/antd-counter";
export type { RunsTableEvents } from "./widgets/antd-runs-table";

/** Everything a host needs to register at once. */
export const antdWidgets: AnyWidgetDefinition[] = [
  antdLabel,
  antdEcho,
  antdCounter,
  antdRunsTable,
  antdButton,
  antdInput,
  antdPagination,
  antdCrash,
];

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
