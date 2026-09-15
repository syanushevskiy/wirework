/**
 * @wirework/widgets-examples — dummy widgets for testing the engine.
 *
 * Contract proof: this package depends on @wirework/schema and the
 * @wirework/react adapter ONLY. If an example ever needs engine, store or
 * bus internals, the widget contract has leaked. No example writes the
 * store — every state change is an emitted event plus a reaction.
 */
import { z } from "zod";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { dummyButton } from "./widgets/dummy-button";
import { dummyCounter } from "./widgets/dummy-counter";
import { dummyCrash } from "./widgets/dummy-crash";
import { dummyEcho } from "./widgets/dummy-echo";
import { dummyInput } from "./widgets/dummy-input";
import { dummyLabel } from "./widgets/dummy-label";
import { dummyRunsTable } from "./widgets/dummy-runs-table";

export { dummyButton, dummyCounter, dummyCrash, dummyEcho, dummyInput, dummyLabel, dummyRunsTable };
export { VALIDATION_RULES, validate } from "./validation";
export { LABEL_TONES } from "./widgets/dummy-label";
export type { ValidationRule, ValidationResult } from "./validation";
export type { ButtonEvents } from "./widgets/dummy-button";
export type { InputEvents } from "./widgets/dummy-input";
export type { CounterEvents } from "./widgets/dummy-counter";
export type { RunsTableEvents } from "./widgets/dummy-runs-table";

/** Everything a host needs to register at once. */
export const exampleWidgets: AnyWidgetDefinition[] = [
  dummyLabel,
  dummyEcho,
  dummyCounter,
  dummyRunsTable,
  dummyButton,
  dummyInput,
  dummyCrash,
];

/**
 * Deliberately INVALID definitions — for asserting that registration rejects
 * them loudly. Never register these in a real host.
 */
export const brokenWidgets: Record<string, AnyWidgetDefinition> = {
  emptyType: { ...dummyLabel, type: "" },
  badCase: { ...dummyLabel, type: "Not Kebab Case" },
  duplicateOfLabel: { ...dummyEcho, type: "dummy-label" },
  noValidator: {
    ...dummyLabel,
    type: "no-validator",
    viewModel: undefined as never,
  },
  noIo: {
    ...dummyLabel,
    type: "no-io",
    io: undefined as never,
  },
  noEvents: {
    ...dummyLabel,
    type: "no-events",
    events: undefined as never,
  },
  badEventName: {
    ...dummyLabel,
    type: "bad-event-name",
    events: { "Not Kebab": { payload: z.string() } },
  },
  eventNoPayload: {
    ...dummyLabel,
    type: "event-no-payload",
    events: { clicked: {} as never },
  },
};
