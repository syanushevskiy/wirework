/**
 * The schema layer's promises: what a template may say, and what it may
 * never say. Every "regression" case is a bug this suite was written for.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ACTION_NAME,
  KEBAB_NAME,
  NO_EVENTS,
  cellBaseSchema,
  defineContract,
  eventFilter,
  isConfigPath,
  reactionSchema,
  settingFields,
  storePathSchema,
  validatorKeys,
  widgetBindingsSchema,
  type WidgetEvents,
  type WidgetIO,
} from "../index";

const io = {
  inputs: {
    value: { value: z.string(), default: "" },
    extra: { value: z.number(), required: false },
  },
} satisfies WidgetIO;

const events = {
  changed: { payload: z.object({ value: z.string(), valid: z.boolean() }), required: true, primary: "value" },
} satisfies WidgetEvents;

describe("storePathSchema", () => {
  it("accepts dot paths and rejects malformed ones", () => {
    expect(storePathSchema.safeParse("runs.data.current").success).toBe(true);
    expect(storePathSchema.safeParse("").success).toBe(false);
    expect(storePathSchema.safeParse("a..b").success).toBe(false);
    expect(storePathSchema.safeParse("with space").success).toBe(false);
  });

  it("rejects prototype segments", () => {
    for (const path of ["__proto__.x", "a.constructor", "prototype"]) {
      expect(storePathSchema.safeParse(path).success).toBe(false);
    }
  });

  it("regression: rejects configuration trees — a binding may not address the page itself", () => {
    expect(storePathSchema.safeParse("viewModels.pages.demo.default").success).toBe(false);
    expect(storePathSchema.safeParse("userViewModels").success).toBe(false);
    expect(isConfigPath("viewModels.anything")).toBe(true);
    expect(isConfigPath("demo.viewModels")).toBe(false);
  });
});

describe("reactionSchema", () => {
  it("accepts each verb", () => {
    expect(reactionSchema.safeParse({ set: "demo.n", from: "value" }).success).toBe(true);
    expect(reactionSchema.safeParse({ call: "runs/load", with: { window: "today" } }).success).toBe(true);
  });

  it("regression: refuses a misspelled key instead of silently dropping it", () => {
    expect(reactionSchema.safeParse({ set: "demo.n", form: "value" }).success).toBe(false);
  });

  it("regression: refuses a reaction that is both verbs at once", () => {
    expect(reactionSchema.safeParse({ set: "demo.n", call: "runs/load" }).success).toBe(false);
  });
});

describe("widgetBindingsSchema", () => {
  const schema = widgetBindingsSchema(io, events);

  it("requires required ports, allows optional ones and defaults `on`", () => {
    expect(schema.parse({ inputs: { value: "demo.text" } })).toEqual({ inputs: { value: "demo.text" }, on: {} });
    expect(schema.safeParse({ inputs: {} }).success).toBe(false);
  });

  it("rejects a binding or a reaction the widget never declared", () => {
    expect(schema.safeParse({ inputs: { value: "a.b", ghost: "a.b" } }).success).toBe(false);
    expect(schema.safeParse({ inputs: { value: "a.b" }, on: { ghost: [{ set: "a.b" }] } }).success).toBe(false);
  });

  it("regression: rejects a misspelled SETTING instead of stripping it", () => {
    const contract = defineContract({
      kind: "label",
      io: { inputs: {} },
      events: NO_EVENTS,
      settings: z.object({ tone: z.enum(["default", "danger"]).default("default") }),
    });
    expect(contract.viewModel.safeParse({ tonne: "danger" }).success).toBe(false);
    expect(contract.viewModel.parse({ tone: "danger" })).toMatchObject({ tone: "danger" });
  });
});

describe("cellBaseSchema", () => {
  it("regression: refuses a template name containing a dot", () => {
    const cell = { id: "c1", widget: "w", model: "widgets.w", template: "v1.0" };
    expect(cellBaseSchema.safeParse(cell).success).toBe(false);
    expect(cellBaseSchema.safeParse({ ...cell, template: "v1" }).success).toBe(true);
  });
});

describe("name grammars", () => {
  it("kebab for identities, optionally namespaced for actions", () => {
    expect(KEBAB_NAME.test("runs-table")).toBe(true);
    expect(KEBAB_NAME.test("runs/load")).toBe(false);
    expect(ACTION_NAME.test("runs/load")).toBe(true);
    expect(ACTION_NAME.test("Runs/Load")).toBe(false);
  });
});

describe("introspection", () => {
  it("reads primitive settings with their kind, default and description", () => {
    const schema = widgetBindingsSchema(io, events).extend({
      label: z.string().describe("Field label"),
      tone: z.enum(["default", "danger"]).default("default"),
      count: z.number().optional(),
      flag: z.boolean().default(false),
      columns: z.array(z.string()).default([]),
    });
    const byName = Object.fromEntries(settingFields(schema).map((field) => [field.name, field]));
    expect(Object.keys(byName)).toEqual(["label", "tone", "count", "flag"]);
    expect(byName["label"]).toMatchObject({ kind: "text", required: true, description: "Field label" });
    expect(byName["tone"]).toMatchObject({ kind: "select", options: ["default", "danger"], defaultValue: "default" });
    expect(byName["count"]).toMatchObject({ kind: "number", required: false });
    expect(byName["flag"]).toMatchObject({ kind: "boolean", defaultValue: false });
  });

  it("lists payload keys for a reaction's `from`, and nothing for a non-object", () => {
    expect(validatorKeys(events.changed.payload)).toEqual(["value", "valid"]);
    expect(validatorKeys(z.string())).toBeUndefined();
  });
});

describe("eventFilter", () => {
  it("pins the widget type and event name, and accepts a source", () => {
    const definition = { type: "input", io, events, viewModel: z.unknown(), component: null };
    expect(eventFilter(definition, "changed")).toEqual({ widget: "input", name: "changed" });
    expect(eventFilter(definition, "changed", { cell: "c1" })).toMatchObject({ cell: "c1" });
  });
});
