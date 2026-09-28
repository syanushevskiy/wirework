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
  pageBindingsSchema,
  pageEvents,
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

describe("defineContract", () => {
  it("refuses a setting named like a binding — it would replace the wiring in the view model", () => {
    expect(() =>
      defineContract({ kind: "odd", io, events, settings: z.object({ inputs: z.string(), tone: z.string() }) }),
    ).toThrow(/names a setting "inputs": inputs and on are the bindings/);
    expect(() => defineContract({ kind: "odd", io, events, settings: z.object({ on: z.string() }) })).toThrow(/"on"/);
  });

  it("keeps a rule the settings object carries, and still offers the settings as fields", () => {
    const contract = defineContract({
      kind: "ranged",
      io,
      events,
      settings: z
        .object({ min: z.number().default(0), max: z.number().default(10) })
        .refine((range) => range.min <= range.max, { message: "min must not exceed max" }),
    });
    const bindings = { inputs: { value: "form.text" } };
    expect(contract.viewModel.parse({ ...bindings, min: 1, max: 2 })).toMatchObject({ min: 1, max: 2 });
    expect(contract.viewModel.safeParse({ ...bindings, min: 5, max: 2 }).error?.issues[0]?.message).toBe(
      "min must not exceed max",
    );
    // An unknown key is still refused; the fields are still found through the rule.
    expect(contract.viewModel.safeParse({ ...bindings, mni: 1 }).success).toBe(false);
    expect(settingFields(contract.viewModel).map((field) => field.name)).toEqual(["min", "max"]);
    expect(validatorKeys(contract.viewModel)).toEqual(["inputs", "on", "min", "max"]);
  });
});

describe("pageBindingsSchema", () => {
  it("is derived from the page events: their names and nothing else", () => {
    expect(Object.keys(pageBindingsSchema.shape)).toEqual(Object.keys(pageEvents));
    expect(pageBindingsSchema.parse({ load: [{ call: "overview/load" }] })).toEqual({
      load: [{ call: "overview/load" }],
    });
    expect(pageBindingsSchema.safeParse({ opened: [] }).success).toBe(false);
  });
});

describe("settingFields per zod wrapper", () => {
  const field = (schema: z.ZodTypeAny) => settingFields(z.object({ x: schema }))[0];

  it("reads a description from the setting or any wrapper around it", () => {
    expect(field(z.string().describe("inner").optional())?.description).toBe("inner");
    expect(field(z.string().optional().describe("outer"))?.description).toBe("outer");
    expect(field(z.string().describe("inner").default("a").describe("outer"))?.description).toBe("outer");
  });

  it("keeps a nullable setting required, and an optional or defaulted one not", () => {
    expect(field(z.string().nullable())).toMatchObject({ kind: "text", required: true });
    expect(field(z.string().optional())).toMatchObject({ kind: "text", required: false });
    expect(field(z.string().default("a"))).toMatchObject({ kind: "text", required: false, defaultValue: "a" });
    expect(field(z.string().default("a").optional())).toMatchObject({ required: false, defaultValue: "a" });
    expect(field(z.string().optional().default("a"))).toMatchObject({ required: false, defaultValue: "a" });
  });

  it("takes the outermost default when there are two", () => {
    expect(field(z.number().default(1).default(2))?.defaultValue).toBe(2);
  });

  it("sees through a rule, a catch, readonly and a brand to the setting's type", () => {
    expect(field(z.string().refine((text) => text.length < 10))).toMatchObject({ kind: "text", required: true });
    expect(field(z.number().catch(0))).toMatchObject({ kind: "number", required: true });
    expect(field(z.boolean().readonly().default(true))).toMatchObject({ kind: "boolean", defaultValue: true });
    expect(field(z.string().brand("Name").optional())).toMatchObject({ kind: "text", required: false });
  });

  it("offers a native enum's names and a single literal as a select", () => {
    enum Tone {
      Quiet = "quiet",
      Loud = "loud",
    }
    expect(field(z.nativeEnum(Tone).default(Tone.Quiet))).toMatchObject({
      kind: "select",
      options: ["quiet", "loud"],
      defaultValue: "quiet",
    });
    expect(field(z.literal("fixed"))).toMatchObject({ kind: "select", options: ["fixed"] });
    expect(field(z.literal(42))).toBeUndefined();
  });

  it("leaves out what it cannot offer as a field, and reserved keys", () => {
    const schema = z.object({ inputs: z.string(), on: z.string(), list: z.array(z.string()), when: z.date() });
    expect(settingFields(schema)).toEqual([]);
    expect(settingFields(z.string())).toEqual([]);
  });

  it("pins the zod internals it reads, so an upgrade that moves them fails here and not in a builder", () => {
    const wrapped = z.string().optional().default("a");
    expect(wrapped).toBeInstanceOf(z.ZodDefault);
    expect(wrapped._def.defaultValue()).toBe("a");
    expect(wrapped._def.innerType).toBeInstanceOf(z.ZodOptional);
    expect(wrapped._def.innerType._def.innerType).toBeInstanceOf(z.ZodString);
    expect(z.string().nullable()._def.innerType).toBeInstanceOf(z.ZodString);
    expect(z.object({ a: z.string() }).shape).toEqual({ a: expect.any(z.ZodString) });
  });
});

describe("settingFields with json", () => {
  const params = z.object({
    url: z.string().optional().describe("Where the API lives"),
    into: z.string(),
    pageSize: z.number().optional(),
    columns: z.record(z.string(), z.object({ hidden: z.boolean().optional() })).optional(),
  });

  it("leaves non-primitive fields out by default, as for widget settings", () => {
    expect(settingFields(params).map((field) => field.name)).toEqual(["url", "into", "pageSize"]);
  });

  it("offers them as json on request, for an action's parameters", () => {
    const fields = settingFields(params, { json: true });
    expect(fields.map((field) => [field.name, field.kind, field.required])).toEqual([
      ["url", "text", false],
      ["into", "text", true],
      ["pageSize", "number", false],
      ["columns", "json", false],
    ]);
    expect(fields[0]?.description).toBe("Where the API lives");
  });
});
