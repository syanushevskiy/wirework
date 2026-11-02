/**
 * The condition rows of the widget form: a typed value as the literal the
 * check takes, a row as a sentence, what is saved and what comes back —
 * blank rows left out, a refused value never saved, an `any` member kept.
 */
import { describe, expect, it } from "vitest";
import { STANDARD_PREDICATES, createPredicates } from "@wirework/engine";
import {
  EMPTY_CONDITION,
  conditionFieldOf,
  draftsOfWhen,
  editTree,
  emptyGroup,
  literalOf,
  predicateChoices,
  whenOfConditions,
  type ConditionDraft,
  type GroupDraft,
  type TestDraft,
} from "../form-when";
import { valuesFromViewModel } from "../form-drafts";
import { counter } from "./fixtures";

describe("literalOf", () => {
  it("reads every kind of value, and says why one cannot be read", () => {
    expect(literalOf("none", "anything")).toEqual({});
    expect(literalOf("text", " Failed ")).toEqual({ value: "Failed" });
    expect(literalOf("text", "")).toEqual({ error: "a value is needed" });
    expect(literalOf("number", "10")).toEqual({ value: 10 });
    expect(literalOf("number", "ten")).toEqual({ error: "not a number" });
    expect(literalOf("list", "admin, owner,")).toEqual({ value: ["admin", "owner"] });
    expect(literalOf("list", " , ")).toEqual({ error: "at least one value, comma-separated" });
    expect(literalOf("boolean", "true")).toEqual({ value: true });
    expect(literalOf("boolean", "yes")).toEqual({ error: "true or false" });
    expect(literalOf("json", '{"a":1}')).toEqual({ value: { a: 1 } });
    expect(literalOf("json", "{")).toEqual({ error: "not valid JSON" });
  });
});

describe("conditionFieldOf", () => {
  it("takes the value field's kind from the chosen check, and reads the row as a sentence", () => {
    const row = conditionFieldOf(0, { path: "runs.total", is: "greater", to: "10", not: false }, STANDARD_PREDICATES);
    expect(row).toMatchObject({
      toKind: "number",
      sentence: "when runs.total is greater than 10",
      saves: { path: "runs.total", is: "greater", to: 10 },
    });
    expect(row.toError).toBeUndefined();
    expect(conditionFieldOf(0, { path: "a", is: "empty", to: "", not: true }, STANDARD_PREDICATES)).toMatchObject({
      toKind: "none",
      sentence: "unless a is empty",
      saves: { path: "a", is: "empty", not: true },
    });
    const blank = conditionFieldOf(0, EMPTY_CONDITION, STANDARD_PREDICATES);
    expect(blank.toKind).toBe("none");
    expect(blank.saves).toBeUndefined();
    expect(blank.sentence).toBeUndefined();
  });

  it("says why a value cannot be used — unreadable, or refused by the check itself", () => {
    const refused = conditionFieldOf(0, { path: "a", is: "greater", to: "ten", not: false }, STANDARD_PREDICATES);
    expect(refused.toError).toBe("not a number");
    expect(refused.saves).toBeUndefined();
    expect(conditionFieldOf(0, { path: "a", is: "contains", to: "", not: false }, STANDARD_PREDICATES).toError).toBe(
      "a value is needed",
    );
  });

  it("prints a constructor's tree as the words the engine reads, once every test is finished", () => {
    const tree: GroupDraft = {
      join: "or",
      not: false,
      parts: [
        { path: "a", is: "empty", to: "", not: false },
        {
          join: "and",
          not: true,
          parts: [
            { path: "b", is: "equal", to: "x", not: false },
            { path: "c", is: "true", to: "", not: true },
          ],
        },
      ],
    };
    const words = 'a is empty or not (b equals "x" and not c is true)';
    const row = conditionFieldOf(0, { tree }, STANDARD_PREDICATES);
    expect(row).toMatchObject({ is: "constructor", sentence: `when ${words}`, saves: { expression: words } });
    expect(row.tree?.parts.map((part) => part.at)).toEqual(["0", "1"]);
    expect(row.tree?.parts[1]).toMatchObject({ at: "1", parts: [{ at: "1.0" }, { at: "1.1" }] });

    const unfinished = conditionFieldOf(0, { tree: emptyGroup() }, STANDARD_PREDICATES);
    expect(unfinished.toError).toBe("finish every condition");
    expect(unfinished.saves).toBeUndefined();
    const refused = conditionFieldOf(
      0,
      { tree: { join: "and", not: false, parts: [{ path: "a", is: "greater", to: "ten", not: false }] } },
      STANDARD_PREDICATES,
    );
    expect(refused.toError).toBe("not a number");
    expect(predicateChoices(STANDARD_PREDICATES).at(-1)?.value).toBe("constructor");
  });

  it("keeps saved words it cannot read as they are, with the problem", () => {
    const row = conditionFieldOf(0, { expression: "a is empty or (" }, STANDARD_PREDICATES);
    expect(row).toMatchObject({ is: "constructor", expression: "a is empty or (" });
    expect(row.toError).toBe("cannot be read: a condition is missing at the end");
    expect(row.saves).toBeUndefined();
  });

  it("shows an any member as its sentence alone, fixed", () => {
    const any = {
      any: [
        { path: "a", is: "true" as const },
        { path: "b", is: "false" as const },
      ],
    };
    const row = conditionFieldOf(1, any, STANDARD_PREDICATES);
    expect(row.fixed).toBe(any);
    expect(row.saves).toBe(any);
    expect(row.sentence).toBe("when one of: when a is true or when b is false");
  });
});

describe("whenOfConditions and draftsOfWhen", () => {
  const rows = (drafts: ConditionDraft[]) =>
    whenOfConditions(drafts.map((draft, index) => conditionFieldOf(index, draft, STANDARD_PREDICATES)));

  it("saves what each holding row saves, blank and refused ones left out, any members kept, nothing as undefined", () => {
    const any = { any: [{ path: "a", is: "true" as const }] };
    expect(
      rows([
        { path: "runs.total", is: "greater", to: "10", not: false },
        EMPTY_CONDITION,
        { path: "app.role", is: "one-of", to: "admin, owner", not: true },
        { path: "x", is: "less", to: "nope", not: false },
        any,
      ]),
    ).toEqual([
      { path: "runs.total", is: "greater", to: 10 },
      { path: "app.role", is: "one-of", to: ["admin", "owner"], not: true },
      any,
    ]);
    expect(rows([EMPTY_CONDITION])).toBeUndefined();
  });

  it("brings a saved condition back as rows — words as the tree they print to — and the editor starts from them", () => {
    const when = [
      { path: "runs.total", is: "greater", to: 10 },
      { path: "app.role", is: "one-of", to: ["admin", "owner"], not: true },
      { any: [{ path: "a", is: "true" }] },
      { expression: 'a is empty or not (b equals "x" and not c is true)' },
      { expression: "not a is empty" },
      { expression: "a is empty or (" },
    ];
    expect(draftsOfWhen(when, STANDARD_PREDICATES)).toEqual([
      { path: "runs.total", is: "greater", to: "10", not: false },
      { path: "app.role", is: "one-of", to: "admin, owner", not: true },
      { any: [{ path: "a", is: "true" }] },
      {
        tree: {
          join: "or",
          not: false,
          parts: [
            { path: "a", is: "empty", to: "", not: false },
            {
              join: "and",
              not: true,
              parts: [
                { path: "b", is: "equal", to: "x", not: false },
                { path: "c", is: "true", to: "", not: true },
              ],
            },
          ],
        },
      },
      { tree: { join: "and", not: false, parts: [{ path: "a", is: "empty", to: "", not: true }] } },
      { expression: "a is empty or (" },
    ]);
    expect(valuesFromViewModel(counter, { inputs: { value: "demo.n" }, on: {}, when }).conditions).toHaveLength(6);
    expect(valuesFromViewModel(counter, { inputs: { value: "demo.n" }, on: {} }).conditions).toEqual([]);
  });
});

describe("editTree", () => {
  const leaf = (path: string): TestDraft => ({ ...EMPTY_CONDITION, path });

  it("sets a test, adds a test or a group to a group, changes a group, removes a part — at a place, immutably", () => {
    const start = emptyGroup();
    const withPath = editTree(start, "0", { set: { path: "a" } });
    expect(withPath.parts).toEqual([leaf("a")]);
    expect(start.parts[0]).toEqual(EMPTY_CONDITION);
    const withGroup = editTree(withPath, "", { add: "group" });
    expect(withGroup.parts).toEqual([leaf("a"), emptyGroup()]);
    const deeper = editTree(editTree(withGroup, "1", { add: "test" }), "1.1", { set: { path: "b" } });
    expect(deeper.parts[1]).toEqual({ join: "and", not: false, parts: [EMPTY_CONDITION, leaf("b")] });
    const joined = editTree(deeper, "1", { group: { join: "or", not: true } });
    expect(joined.parts[1]).toMatchObject({ join: "or", not: true });
    expect(editTree(joined, "1.0", "remove").parts[1]).toMatchObject({ parts: [leaf("b")] });
    expect(editTree(joined, "0", "remove").parts).toHaveLength(1);
  });

  it("leaves the tree alone for an edit that does not fit its node, and never removes the root", () => {
    const start = editTree(emptyGroup(), "0", { set: { path: "a" } });
    expect(editTree(start, "0", { add: "test" })).toEqual(start);
    expect(editTree(start, "", { set: { path: "x" } })).toEqual(start);
    expect(editTree(start, "", "remove")).toBe(start);
    expect(editTree(start, "7", { set: { path: "x" } })).toEqual(start);
  });
});

describe("predicateChoices", () => {
  it("offers every check by its phrase, a host's with its namespace", () => {
    const predicates = createPredicates();
    predicates.register({ name: "runs/retryable", description: "x", phrase: "can be retried", test: () => true });
    const choices = predicateChoices(predicates);
    expect(choices[0]).toEqual({ value: "empty", label: "is empty" });
    expect(choices.at(-2)).toEqual({ value: "runs/retryable", label: "can be retried (runs)" });
    expect(choices.at(-1)?.value).toBe("constructor");
  });
});
