/**
 * Conditions: the predicate registry (the standard eight built in, the
 * host's own on top), `holds` over AND, any and not, the one wording, and
 * what resolve reports about a condition that names the wrong thing.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { When } from "@wirework/schema";
import { STANDARD_PREDICATES, createPredicates, holds, resolvePage, whenPaths, whenProblems, whenText } from "../index";
import { cell, counter, enginesWith, listEngine, page, plain, registryWith } from "./fixtures";

const retryable = {
  name: "runs/retryable",
  description: "a failed run with an even id",
  phrase: "can be retried",
  test: (run: unknown) => {
    const record = run as { id?: string; state?: string } | null;
    return record?.state === "Failed" && Number(record.id) % 2 === 0;
  },
};

const withHost = () => {
  const predicates = createPredicates();
  predicates.register(retryable);
  return predicates;
};

const state: Record<string, unknown> = {
  "run.error": "",
  "run.state": "Failed",
  "runs.total": 23,
  "app.role": "admin",
  "run.data": { id: "123456", state: "Failed" },
};
const read = (path: string): unknown => state[path];

describe("createPredicates", () => {
  it("starts with the standard eight, namespaced host predicates on top, and refuses a broken one", () => {
    const predicates = withHost();
    expect(predicates.keys()).toEqual([
      "empty",
      "true",
      "false",
      "equal",
      "one-of",
      "contains",
      "greater",
      "less",
      "runs/retryable",
    ]);
    expect(() => predicates.register({ ...retryable, name: "equal" })).toThrow(/already registered/);
    expect(() => predicates.register({ ...retryable, name: "a/b/c" })).toThrow(/not a valid identifier/);
    expect(() => predicates.register({ ...retryable, name: "x", test: undefined as never })).toThrow(/has no test/);
    expect(() => predicates.register({ ...retryable, name: "y", phrase: "" })).toThrow(/has no phrase/);
    expect(() => predicates.register({ ...retryable, name: "z", description: "" })).toThrow(/has no description/);
    expect(() => predicates.register({ ...retryable, name: "w", argument: {} as never })).toThrow(
      /argument that is not a validator/,
    );
  });

  it("the shared standard registry is sealed: a host registers into its own", () => {
    expect(() => STANDARD_PREDICATES.register(retryable)).toThrow(/sealed/);
  });
});

describe("holds", () => {
  it("no condition always holds; every member must; any needs one; not negates", () => {
    expect(holds(undefined, read)).toBe(true);
    expect(holds([{ path: "run.error", is: "empty" }], read)).toBe(true);
    expect(holds([{ path: "run.error", is: "empty", not: true }], read)).toBe(false);
    expect(
      holds(
        [
          { path: "run.state", is: "equal", to: "Failed" },
          { path: "runs.total", is: "greater", to: 10 },
        ],
        read,
      ),
    ).toBe(true);
    expect(
      holds(
        [
          { path: "run.state", is: "equal", to: "Failed" },
          { path: "runs.total", is: "greater", to: 100 },
        ],
        read,
      ),
    ).toBe(false);
    expect(
      holds(
        [
          {
            any: [
              { path: "run.state", is: "equal", to: "Running" },
              { path: "run.state", is: "equal", to: "Failed" },
            ],
          },
        ],
        read,
      ),
    ).toBe(true);
    expect(holds([{ any: [{ path: "run.state", is: "equal", to: "Running" }] }], read)).toBe(false);
  });

  it("evaluates a host predicate from the registry given, and never holds for an unknown name", () => {
    const when: When = [{ path: "run.data", is: "runs/retryable" }];
    expect(holds(when, read, withHost())).toBe(true);
    expect(holds(when, read)).toBe(false);
    expect(holds([{ path: "run.data", is: "runs/retryable", not: true }], read)).toBe(true);
  });

  it("whenPaths lists what a condition reads, any members included", () => {
    expect(
      whenPaths([
        { path: "a", is: "empty" },
        {
          any: [
            { path: "b", is: "true" },
            { path: "c", is: "false" },
          ],
        },
      ]),
    ).toEqual(["a", "b", "c"]);
    expect(whenPaths(undefined)).toEqual([]);
  });
});

describe("whenText", () => {
  it("reads as a sentence: when, unless, one of; text quoted, lists as items", () => {
    expect(
      whenText([
        { path: "run.error", is: "empty", not: true },
        { path: "app.role", is: "one-of", to: ["admin", "owner"] },
        { path: "runs.total", is: "greater", to: 10 },
        {
          any: [
            { path: "run.state", is: "equal", to: "Failed" },
            { path: "flag", is: "true" },
          ],
        },
      ]),
    ).toBe(
      'unless run.error is empty, when app.role is one of "admin", "owner", when runs.total is greater than 10, when one of: when run.state equals "Failed" or when flag is true',
    );
    expect(whenText([{ path: "run.data", is: "runs/retryable" }], withHost())).toBe("when run.data can be retried");
    expect(whenText([{ path: "run.data", is: "runs/retryable" }])).toBe('when run.data is "runs/retryable"');
  });
});

describe("whenProblems", () => {
  it("names an unknown predicate, a refused literal, a literal nobody takes and a missing one, by position", () => {
    expect(whenProblems(undefined)).toBeUndefined();
    expect(whenProblems([{ path: "a", is: "empty" }])).toBeUndefined();
    expect(whenProblems([{ path: "a", is: "equals", to: 1 }])).toBe(
      'when[0] uses an unknown predicate "equals" (registered: empty, true, false, equal, one-of, contains, greater, less)',
    );
    expect(whenProblems([{ path: "a", is: "greater", to: "ten" }])).toMatch(
      /^when\[0\] gives "greater" a value it refuses: .*number/,
    );
    expect(
      whenProblems([
        { path: "a", is: "empty" },
        { path: "a", is: "empty", to: 1 },
      ]),
    ).toBe('when[1] gives "empty" a value, and it takes none');
    expect(whenProblems([{ any: [{ path: "a", is: "equal" }] }])).toBe(
      'when[0].any[0] gives "equal" no value, and it takes one',
    );
    expect(whenProblems([{ path: "a", is: "runs/retryable" }], withHost())).toBeUndefined();
  });
});

describe("a condition on a cell", () => {
  const templates = (when: unknown) => ({
    counter: { default: { inputs: { value: "demo.n" }, on: { changed: [{ set: "demo.n" }] }, when } },
  });
  const plan = (when: unknown, predicates = withHost()) =>
    resolvePage({
      viewModels: page([cell()], templates(when)),
      page: "demo",
      registry: registryWith(counter, plain),
      layoutEngines: enginesWith(listEngine),
      predicates,
    });

  it("resolves with its condition in the view model when it names what is registered", () => {
    const resolved = plan([{ path: "run.data", is: "runs/retryable" }]);
    if (resolved.problem !== undefined) throw new Error(resolved.problem);
    const [first] = resolved.cells;
    expect(first?.problem).toBeUndefined();
    expect((first?.viewModel as { when: When }).when).toEqual([{ path: "run.data", is: "runs/retryable" }]);
  });

  it("is a cell problem when it names an unknown predicate or gives the wrong literal", () => {
    const resolved = plan([{ path: "run.data", is: "runs/retryable" }], STANDARD_PREDICATES);
    if (resolved.problem !== undefined) throw new Error(resolved.problem);
    expect(resolved.cells[0]?.problem).toEqual({
      kind: "unmet-contract",
      message:
        'the condition is wrong: when[0] uses an unknown predicate "runs/retryable" (registered: empty, true, false, equal, one-of, contains, greater, less)',
    });
    const refused = plan([{ path: "a", is: "less", to: z.string().parse("1") }]);
    if (refused.problem !== undefined) throw new Error(refused.problem);
    expect(refused.cells[0]?.problem?.kind).toBe("unmet-contract");
  });

  it("is an invalid view model when its shape is wrong: the widget's own schema refuses it", () => {
    const resolved = plan([{ path: "viewModels.pages", is: "empty" }]);
    if (resolved.problem !== undefined) throw new Error(resolved.problem);
    expect(resolved.cells[0]?.problem?.kind).toBe("invalid-view-model");
  });
});
