/**
 * Conditions — WHEN a widget shows (doc/conditions-design.md).
 *
 * Beside `inputs` and `on`, a widget's view model may carry `when`: a list
 * of tests that must ALL hold for the widget to show. A test reads ONE
 * store path and names ONE predicate, with the literal the predicate takes;
 * `not` negates it ("unless"); a member of the list may be `{ any: [...] }`,
 * which holds when ONE of its tests does. That is the whole grammar: no
 * expressions, no two paths compared, nothing deeper than AND of ORs. A
 * value that needs computing is computed by an action into the store, and
 * the condition reads it.
 *
 * The predicates themselves are a registry the engine fills with the
 * standard eight and a host extends with its own (`PredicateDefinition`).
 */
import { z } from "zod";
import { isPlainObject, valueText } from "../paths";
import { PREDICATE_NAME } from "./names";
import { storePathSchema } from "./io";
import type { Validator } from "./widget";

/** strict: a misspelt key ("paht") must fail, never be dropped. */
export const whenTestSchema = z
  .object({
    /** The store path read — a DATA path, never a configuration tree. */
    path: storePathSchema,
    /** The predicate's name: "empty", "equal", "runs/retryable". */
    is: z.string().regex(PREDICATE_NAME, "must be a kebab-case predicate name, optionally namespaced"),
    /** The literal the predicate takes; the predicate's own `argument` checks it. */
    to: z.unknown().optional(),
    /** Negated: the widget shows UNLESS the test holds. */
    not: z.boolean().optional(),
  })
  .strict();
export type WhenTest = z.infer<typeof whenTestSchema>;

/** One of these must hold. Plain tests only: AND of ORs, nothing deeper. */
export const whenAnySchema = z.object({ any: z.array(whenTestSchema).min(1) }).strict();
export type WhenAny = z.infer<typeof whenAnySchema>;

/**
 * The CONSTRUCTOR: tests composed in words — `and`, `or`, `not` and
 * parentheses over the same leaves, each a path, a predicate's phrase and
 * its value: `run.error is empty or (run.state equals "Failed" and not
 * run.data can be retried)`. Boolean composition of named checks, never an
 * expression over values. The engine parses it against the registry.
 */
export const whenExpressionSchema = z.object({ expression: z.string().trim().min(1) }).strict();
export type WhenExpression = z.infer<typeof whenExpressionSchema>;

export type WhenMember = WhenTest | WhenAny | WhenExpression;

/** The `when` section: every member must hold. An empty list is a mistake, not "always". */
export const whenSchema = z.array(z.union([whenTestSchema, whenAnySchema, whenExpressionSchema])).min(1);
export type When = z.infer<typeof whenSchema>;

/**
 * One named check a condition may use. PURE and synchronous: a function of
 * the value and the literal — no store, no bus, no clock, no throw. Anything
 * that needs more is an action that writes a value the condition then reads.
 */
export interface PredicateDefinition<A = unknown> {
  /** "equal", "runs/retryable" — `PREDICATE_NAME`. */
  name: string;
  /** The test as a sentence, shown by builders: "the value, as text, equals the given text". */
  description: string;
  /** How a test READS: "<path> <phrase> <to>" — "equals", "is greater than", "can be retried". */
  phrase: string;
  /** What `to` must be; absent: the test takes no `to` (empty, true, false). */
  argument?: Validator<A>;
  test: (value: unknown, to: A) => boolean;
}

/** Erasure point for registries and lists. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPredicateDefinition = PredicateDefinition<any>;

/** A finite number, or text that is one ("5", not "" and not a boolean); undefined otherwise. */
function numberOf(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

const literal = z.union([z.string(), z.number(), z.boolean()]);

/**
 * The standard set, built into every predicate registry — one rule each,
 * written in the description. Text predicates compare the value AS TEXT
 * (`valueText`), exactly as a tag cell's tones do: `5` equals `"5"`. Number
 * predicates read numbers and numeric text and do not hold otherwise.
 * Declared here, beside the grammar, like the page events: the engine
 * registers them, a builder reads their arguments.
 */
export const standardPredicates: readonly AnyPredicateDefinition[] = [
  {
    name: "empty",
    phrase: "is empty",
    description: "nothing to show: no value, null, an empty text, an empty list or an empty object",
    test: (value) =>
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (isPlainObject(value) && Object.keys(value).length === 0),
  },
  {
    name: "true",
    phrase: "is true",
    description: "the value is exactly true (a missing value is neither true nor false)",
    test: (value) => value === true,
  },
  {
    name: "false",
    phrase: "is false",
    description: "the value is exactly false (a missing value is neither true nor false)",
    test: (value) => value === false,
  },
  {
    name: "equal",
    phrase: "equals",
    description: 'the value, as text, equals the given text (5 equals "5")',
    argument: literal,
    test: (value, to: string | number | boolean) => valueText(value) === valueText(to),
  },
  {
    name: "one-of",
    phrase: "is one of",
    description: "the value, as text, equals one of the given values",
    argument: z.array(literal).min(1),
    test: (value, to: (string | number | boolean)[]) => to.some((item) => valueText(item) === valueText(value)),
  },
  {
    name: "contains",
    phrase: "contains",
    description: "the value, as text, contains the given text (case-sensitive)",
    argument: z.string().min(1),
    test: (value, to: string) => valueText(value).includes(to),
  },
  {
    name: "greater",
    phrase: "is greater than",
    description: "the value is a number, or text that is one, greater than the given number",
    argument: z.number(),
    test: (value, to: number) => {
      const number = numberOf(value);
      return number !== undefined && number > to;
    },
  },
  {
    name: "less",
    phrase: "is less than",
    description: "the value is a number, or text that is one, less than the given number",
    argument: z.number(),
    test: (value, to: number) => {
      const number = numberOf(value);
      return number !== undefined && number < to;
    },
  },
];
