/**
 * The constructor: a condition in words parsed against the registry's
 * phrases — precedence, parentheses, `not`, lists, a host's phrase — and
 * every way it can fail to read, as a sentence.
 */
import { describe, expect, it } from "vitest";
import { createPredicates, holds, whenPaths, whenProblems, whenText } from "../index";
import { parseExpression } from "../expressions";

const predicates = createPredicates();
predicates.register({
  name: "runs/retryable",
  description: "a failed run with an even id",
  phrase: "can be retried",
  test: (run: unknown) => (run as { id?: number } | null)?.id === 2,
});

const parse = (text: string) => parseExpression(text, predicates);

describe("parseExpression", () => {
  it("reads a test, its literal typed, a list for a list check", () => {
    expect(parse("run.error is empty").node).toEqual({ path: "run.error", is: "empty" });
    expect(parse('run.state equals "Failed"').node).toEqual({ path: "run.state", is: "equal", to: "Failed" });
    expect(parse("runs.total is greater than 10").node).toEqual({ path: "runs.total", is: "greater", to: 10 });
    expect(parse("flag equals true").node).toEqual({ path: "flag", is: "equal", to: true });
    expect(parse('app.role is one of "admin", "owner"').node).toEqual({
      path: "app.role",
      is: "one-of",
      to: ["admin", "owner"],
    });
    expect(parse('app.role is one of "admin"').node).toEqual({ path: "app.role", is: "one-of", to: ["admin"] });
    expect(parse("run.data can be retried").node).toEqual({ path: "run.data", is: "runs/retryable" });
  });

  it("binds and tighter than or, honours parentheses, and not before a test or a group", () => {
    expect(parse("a is empty or b is empty and c is empty").node).toEqual({
      any: [
        { path: "a", is: "empty" },
        {
          all: [
            { path: "b", is: "empty" },
            { path: "c", is: "empty" },
          ],
        },
      ],
    });
    expect(parse("(a is empty or b is empty) and not c is empty").node).toEqual({
      all: [
        {
          any: [
            { path: "a", is: "empty" },
            { path: "b", is: "empty" },
          ],
        },
        { unless: { path: "c", is: "empty" } },
      ],
    });
    expect(parse("not (a is true and b is true)").node).toEqual({
      unless: {
        all: [
          { path: "a", is: "true" },
          { path: "b", is: "true" },
        ],
      },
    });
  });

  it("says what it could not read", () => {
    expect(parse("").problem).toBe("a condition is missing at the end");
    expect(parse("run.error").problem).toMatch(/^expected a check after "run.error" \(checks: .*is empty, /);
    expect(parse("run.error is bigger than 1").problem).toMatch(
      /expected a check after "run.error", got "is bigger than"/,
    );
    expect(parse("a is empty and").problem).toBe("a condition is missing at the end");
    expect(parse("a is empty or (b is empty").problem).toBe('missing ")"');
    expect(parse("a is empty) ").problem).toBe('unexpected ")"');
    expect(parse("runs.total is greater than").problem).toBe('expected a value after "is greater than"');
    expect(parse("runs.total is greater than ten").problem).toBe('expected a value after "is greater than", got "ten"');
    expect(parse('a equals "unclosed').problem).toBe('cannot read "\\"unclosed"');
    expect(parse("and a is empty").problem).toBe('expected a store path, got "and"');
  });
});

describe("a constructor member of a condition", () => {
  const when = [{ expression: "runs.total is greater than 10 and (run.error is empty or run.data can be retried)" }];
  const state: Record<string, unknown> = { "runs.total": 23, "run.error": "boom", "run.data": { id: 2 } };
  const read = (path: string): unknown => state[path];

  it("holds as its words say, reads the paths its leaves name, and reads back as itself", () => {
    expect(holds(when, read, predicates)).toBe(true);
    expect(holds(when, (path) => (path === "run.data" ? { id: 1 } : state[path]), predicates)).toBe(false);
    expect(whenPaths(when, predicates)).toEqual(["runs.total", "run.error", "run.data"]);
    expect(whenText(when, predicates)).toBe(
      "when runs.total is greater than 10 and (run.error is empty or run.data can be retried)",
    );
  });

  it("is a problem when it cannot be read or a leaf refuses its literal, and never holds then", () => {
    expect(whenProblems([{ expression: "runs.total is greater than" }], predicates)).toBe(
      'when[0] cannot be read: expected a value after "is greater than"',
    );
    expect(whenProblems([{ expression: 'runs.total is greater than "ten"' }], predicates)).toMatch(
      /^when\[0\] gives "greater" a value it refuses/,
    );
    expect(holds([{ expression: "runs.total is greater than" }], read, predicates)).toBe(false);
    expect(whenPaths([{ expression: "nope" }], predicates)).toEqual([]);
    // A host's phrase is unknown to a registry without the host's predicate.
    expect(whenProblems([{ expression: "run.data can be retried" }])).toMatch(/cannot be read: expected a check/);
  });
});
