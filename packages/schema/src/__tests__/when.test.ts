/**
 * The condition grammar and the standard predicates: what a `when` may say,
 * what it may not, and one rule per predicate over the awkward values.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  NO_EVENTS,
  argumentKind,
  standardPredicates,
  whenSchema,
  widgetBindingsSchema,
  APPEARANCES,
  standardAppearances,
  type AnyPredicateDefinition,
} from "../index";

const issues = (input: unknown): string[] => {
  const result = whenSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
};

const predicate = (name: string): AnyPredicateDefinition => {
  const found = standardPredicates.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`no standard predicate "${name}"`);
  return found;
};

/** The awkward values every predicate is asked about. */
const VALUES = [undefined, null, "", "5", 5, 0, false, true, Number.NaN, [], {}, { a: 1 }, "Failed"] as const;

const holdsFor = (name: string, to?: unknown): unknown[] =>
  VALUES.filter((value) => predicate(name).test(value, to)).map((value) => (Number.isNaN(value) ? "NaN" : value));

describe("whenSchema", () => {
  it("accepts tests, negated tests and one level of any", () => {
    const when = [
      { path: "run.error", is: "empty", not: true },
      { path: "app.permissions.role", is: "one-of", to: ["admin", "owner"] },
      {
        any: [
          { path: "run.state", is: "equal", to: "Failed" },
          { path: "run.data", is: "runs/retryable" },
        ],
      },
    ];
    expect(whenSchema.parse(when)).toEqual(when);
  });

  it("refuses an empty list, a configuration path, a malformed name, a misspelt key and a nested any", () => {
    expect(issues([])).toHaveLength(1);
    expect(issues([{ path: "viewModels.pages", is: "empty" }])[0]).toContain("0.path");
    expect(issues([{ path: "a", is: "Not Kebab" }])[0]).toContain("0.is");
    // A union: zod reports "invalid input" for the member as a whole; the misspelt key is still refused.
    expect(issues([{ paht: "a", is: "empty" }]).length).toBeGreaterThan(0);
    expect(whenSchema.safeParse([{ path: "a", is: "empty", paht: "b" }]).success).toBe(false);
    expect(issues([{ any: [{ any: [{ path: "a", is: "empty" }] }] }]).length).toBeGreaterThan(0);
    expect(issues([{ any: [] }]).length).toBeGreaterThan(0);
  });

  it("is the third reserved section of every widget's view model, optional, with `appear` and `disappear` after it", () => {
    const schema = widgetBindingsSchema({ inputs: {} }, NO_EVENTS);
    expect(schema.parse({})).toEqual({ inputs: {}, on: {} });
    expect(schema.parse({ when: [{ path: "a", is: "empty" }] }).when).toEqual([{ path: "a", is: "empty" }]);
    expect(schema.safeParse({ when: [] }).success).toBe(false);
    // An appearance is a NAME (the registry says which exist): any kebab-case one parses, a malformed one does not.
    expect(schema.parse({ appear: "fade", disappear: "drop" })).toMatchObject({ appear: "fade", disappear: "drop" });
    expect(schema.safeParse({ appear: "Fade In" }).success).toBe(false);
    expect(APPEARANCES).toEqual(standardAppearances.map((appearance) => appearance.name));
  });
});

describe("the standard predicates", () => {
  it("are eight, each with a phrase and a description", () => {
    expect(standardPredicates.map((candidate) => candidate.name)).toEqual([
      "empty",
      "true",
      "false",
      "equal",
      "one-of",
      "contains",
      "greater",
      "less",
    ]);
    for (const candidate of standardPredicates) {
      expect(candidate.phrase).not.toBe("");
      expect(candidate.description).not.toBe("");
    }
  });

  it("empty: nothing to show — not 0, not false, not NaN", () => {
    expect(holdsFor("empty")).toEqual([undefined, null, "", [], {}]);
  });

  it("true and false: exactly that, a missing value neither", () => {
    expect(holdsFor("true")).toEqual([true]);
    expect(holdsFor("false")).toEqual([false]);
  });

  it('equal and one-of compare as text: 5 equals "5"', () => {
    expect(holdsFor("equal", "5")).toEqual(["5", 5]);
    expect(holdsFor("equal", 5)).toEqual(["5", 5]);
    expect(holdsFor("equal", "Failed")).toEqual(["Failed"]);
    expect(holdsFor("equal", "")).toEqual([undefined, null, ""]);
    expect(holdsFor("one-of", ["Failed", 0])).toEqual([0, "Failed"]);
  });

  it("contains: text, case-sensitive, an object by its JSON", () => {
    expect(holdsFor("contains", "ail")).toEqual(["Failed"]);
    expect(holdsFor("contains", "fail")).toEqual([]);
    expect(holdsFor("contains", '"a":1')).toEqual([{ a: 1 }]);
  });

  it("greater and less: numbers and numeric text only", () => {
    expect(holdsFor("greater", 1)).toEqual(["5", 5]);
    expect(holdsFor("less", 1)).toEqual([0]);
    expect(holdsFor("greater", -1)).toEqual(["5", 5, 0]);
  });

  it("declare what their literal must be, for the registry's check and the builder's field", () => {
    expect(argumentKind(predicate("empty").argument)).toEqual({ kind: "none" });
    expect(argumentKind(predicate("equal").argument)).toEqual({ kind: "text" });
    expect(argumentKind(predicate("one-of").argument)).toEqual({ kind: "list" });
    expect(argumentKind(predicate("greater").argument)).toEqual({ kind: "number" });
    expect(argumentKind(z.enum(["a", "b"]))).toEqual({ kind: "select", options: ["a", "b"] });
    expect(argumentKind(z.object({ a: z.string() }))).toEqual({ kind: "json" });
    expect(argumentKind(z.boolean().optional())).toEqual({ kind: "boolean" });
    expect(predicate("greater").argument?.parse(3)).toBe(3);
    expect(() => predicate("greater").argument?.parse("3")).toThrow();
    expect(() => predicate("one-of").argument?.parse([])).toThrow();
  });
});
