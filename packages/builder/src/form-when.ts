/**
 * The CONDITION part of the widget form (doc/ADR/0008-conditions.md): the
 * rows a user fills — a store path, a check picked by its phrase, the value
 * the check takes (typed as text), "when" or "unless" — and how they become
 * the template's `when` and back. The CONSTRUCTOR is built step by step as
 * a TREE of groups (all of / any of, with parentheses) and tests; what it
 * saves are the words the engine reads (`{ expression }`), printed from the
 * tree and parsed back into one when a placed widget is edited. A member
 * the form does not edit (an `any` written in the inspector, words it
 * cannot read) is kept as it is. Pure functions and types; the hook
 * (use-widget-form.ts) holds the state.
 */
import {
  argumentKind,
  type ArgumentKind,
  type When,
  type WhenAny,
  type WhenExpression,
  type WhenMember,
  type WhenTest,
} from "@wirework/schema";
import {
  literalText,
  parsedExpression,
  problemText,
  testText,
  whenProblems,
  whenText,
  type ConditionNode,
  type PredicateRegistry,
} from "@wirework/engine";
import type { Choice } from "./form-drafts";

/** One test as the user types it. */
export interface TestDraft {
  path: string;
  is: string;
  to: string;
  not: boolean;
}

/** A group of the constructor: all of its parts (and) or any of them (or), negated or not; nested, it is a parenthesis. */
export interface GroupDraft {
  join: "and" | "or";
  not: boolean;
  parts: NodeDraft[];
}
export type NodeDraft = TestDraft | GroupDraft;

/** One condition as the user types it: a test, the constructor's tree, or a member riding along untouched. */
export type ConditionDraft = TestDraft | { tree: GroupDraft } | WhenExpression | WhenAny;

/** A row the form offers to fill: no path, no check yet. */
export const EMPTY_CONDITION: TestDraft = { path: "", is: "", to: "", not: false };

/** A constructor starts as one group of one blank test. */
export const emptyGroup = (): GroupDraft => ({ join: "and", not: false, parts: [EMPTY_CONDITION] });

/**
 * The check list's last entry: not a predicate but the CONSTRUCTOR — the
 * row becomes a tree of groups and tests, built step by step.
 */
export const CONSTRUCTOR = "constructor";

export const isGroup = (node: NodeDraft): node is GroupDraft => "parts" in node;
export const isAnyDraft = (draft: ConditionDraft): draft is WhenAny => "any" in draft;
export const isTreeDraft = (draft: ConditionDraft): draft is { tree: GroupDraft } => "tree" in draft;
export const isExpressionDraft = (draft: ConditionDraft): draft is WhenExpression => "expression" in draft;

/** What a test's value field is and holds, from the chosen check: its kind, choices, problem, and the test once it holds. */
export interface TestFacts {
  toKind: ArgumentKind;
  toChoices?: Choice[];
  toError?: string;
  /** The test the draft describes, once path and check are there and the value is taken. */
  test?: WhenTest;
}

/** A test of the constructor as the form shows it, at its place in the tree ("0", "1.0"). */
export type LeafField = TestDraft & TestFacts & { at: string };
/** A group of the constructor as the form shows it. */
export interface GroupField {
  at: string;
  join: "and" | "or";
  not: boolean;
  parts: (LeafField | GroupField)[];
}

/** One condition as the form shows it. */
export interface ConditionField extends TestFacts {
  /** Its place in the list (0 first); part of its field ids. */
  index: number;
  path: string;
  /** The predicate's name ("" while none is chosen; CONSTRUCTOR for a tree or words). */
  is: string;
  /** The value typed; a list as comma-separated items. */
  to: string;
  not: boolean;
  /** The constructor's tree, when the row is one. */
  tree?: GroupField;
  /** Saved words the form could not read into a tree: shown as they are, with the problem. */
  expression?: string;
  /** The row as a sentence (`testText`, or the constructor's words), once it holds together. */
  sentence?: string;
  /** What the row saves — the test, the words, or the `any` member as it was — once it holds together; absent while it does not. */
  saves?: WhenMember;
  /** An `any` member the form shows read-only — its sentence, nothing to edit. */
  fixed?: WhenAny;
}

/** The checks on offer: the standard ones first (registration order), each by its phrase, a host's with its namespace, the constructor last. */
export function predicateChoices(predicates: PredicateRegistry): Choice[] {
  return [
    ...predicates.list().map((predicate) => ({
      value: predicate.name,
      label: predicate.name.includes("/") ? `${predicate.phrase} (${predicate.name.split("/")[0]})` : predicate.phrase,
    })),
    { value: CONSTRUCTOR, label: "constructor — build the condition step by step" },
  ];
}

/** A typed value as the literal the predicate takes: a number parsed, a list split on commas, JSON parsed, text as it is. */
export function literalOf(kind: ArgumentKind, text: string): { value?: unknown; error?: string } {
  const trimmed = text.trim();
  switch (kind) {
    case "none":
      return {};
    case "number": {
      if (trimmed === "") return { error: "a number is needed" };
      const number = Number(trimmed);
      return Number.isNaN(number) ? { error: "not a number" } : { value: number };
    }
    case "boolean":
      return trimmed === "true" ? { value: true } : trimmed === "false" ? { value: false } : { error: "true or false" };
    case "list": {
      const items = trimmed.split(",").flatMap((item) => {
        const value = item.trim();
        return value === "" ? [] : [value];
      });
      return items.length === 0 ? { error: "at least one value, comma-separated" } : { value: items };
    }
    case "json":
      try {
        return trimmed === "" ? { error: "JSON is needed" } : { value: JSON.parse(trimmed) };
      } catch {
        return { error: "not valid JSON" };
      }
    case "text":
    case "select":
      return trimmed === "" ? { error: "a value is needed" } : { value: trimmed };
  }
}

/** A saved literal as the text a row holds: a list as its items, an object as JSON, anything else as text. */
export function literalDraft(to: unknown): string {
  if (to === undefined || to === null) return "";
  if (Array.isArray(to)) return to.map(String).join(", ");
  return typeof to === "object" ? JSON.stringify(to) : String(to);
}

const testDraftOf = (test: WhenTest, not = test.not === true): TestDraft => ({
  path: test.path,
  is: test.is,
  to: literalDraft(test.to),
  not,
});

/** A parsed condition as the constructor's tree; a leaf alone becomes a group of one. */
function treeOf(node: ConditionNode, not = false): NodeDraft {
  if ("unless" in node) return treeOf(node.unless, !not);
  if ("all" in node) return { join: "and", not, parts: node.all.map((part) => treeOf(part)) };
  if ("any" in node) return { join: "or", not, parts: node.any.map((part) => treeOf(part)) };
  return testDraftOf(node, node.not === true ? !not : not);
}

const groupOf = (node: ConditionNode): GroupDraft => {
  const tree = treeOf(node);
  return isGroup(tree) ? tree : { join: "and", not: false, parts: [tree] };
};

/** The template's `when` as the form's rows: tests editable, words as the constructor's tree, `any` members as they are. */
export const draftsOfWhen = (when: When | undefined, predicates: PredicateRegistry): ConditionDraft[] =>
  (when ?? []).map((member) => {
    if ("any" in member) return member;
    if ("expression" in member) {
      // Words the engine cannot read stay words: the problem shows, nothing is lost.
      const parsed = parsedExpression(member, predicates);
      return parsed.node === undefined ? member : { tree: groupOf(parsed.node) };
    }
    return testDraftOf(member);
  });

/** What one test draft's value means under its check, and the test it describes once it holds. */
export function testFactsOf(draft: TestDraft, predicates: PredicateRegistry): TestFacts {
  const predicate = draft.is === "" || draft.is === CONSTRUCTOR ? undefined : predicates.get(draft.is);
  const { kind: toKind, options } = argumentKind(predicate?.argument);
  const { value, error } = toKind === "none" ? {} : literalOf(toKind, draft.to);
  let toError = error;
  if (toError === undefined && predicate?.argument !== undefined) {
    try {
      predicate.argument.parse(value);
    } catch (refusal) {
      toError = problemText(refusal);
    }
  }
  const path = draft.path.trim();
  const test =
    path === "" || predicate === undefined || toError !== undefined
      ? undefined
      : { path, is: draft.is, ...(value === undefined ? {} : { to: value }), ...(draft.not ? { not: true } : {}) };
  return {
    toKind,
    ...(options === undefined ? {} : { toChoices: options.map((option) => ({ value: option, label: option })) }),
    ...(toError === undefined ? {} : { toError }),
    ...(test === undefined ? {} : { test }),
  };
}

/** The constructor's tree as the form shows it, every test with its facts, every node with its place. */
function groupFieldOf(group: GroupDraft, predicates: PredicateRegistry, at = ""): GroupField {
  return {
    at,
    join: group.join,
    not: group.not,
    parts: group.parts.map((part, index) => {
      const here = at === "" ? String(index) : `${at}.${index}`;
      return isGroup(part)
        ? groupFieldOf(part, predicates, here)
        : { ...part, ...testFactsOf(part, predicates), at: here };
    }),
  };
}

/**
 * The tree as the words the engine reads — undefined while a test is not
 * finished. A nested group is a parenthesis, a negated one "not (…)", a
 * negated test "not path phrase value".
 */
function wordsOf(group: GroupField, predicates: PredicateRegistry, root = true): string | undefined {
  const parts: string[] = [];
  for (const part of group.parts) {
    const words = "parts" in part ? wordsOf(part, predicates, false) : leafWords(part, predicates);
    if (words === undefined) return undefined;
    parts.push(words);
  }
  const joined = parts.join(` ${group.join} `);
  const grouped = !root || group.not ? `(${joined})` : joined;
  return group.not ? `not ${grouped}` : grouped;
}

function leafWords(leaf: LeafField, predicates: PredicateRegistry): string | undefined {
  const phrase = predicates.get(leaf.is)?.phrase;
  if (leaf.test === undefined || phrase === undefined) return undefined;
  const { path, to, not } = leaf.test;
  return `${not === true ? "not " : ""}${path} ${phrase}${to === undefined ? "" : ` ${literalText(to)}`}`;
}

/** The first problem a test of the tree has, if any. */
function treeProblem(group: GroupField): string | undefined {
  for (const part of group.parts) {
    const problem = "parts" in part ? treeProblem(part) : part.toError;
    if (problem !== undefined) return problem;
  }
  return undefined;
}

/** One row as the form shows it. */
export function conditionFieldOf(index: number, draft: ConditionDraft, predicates: PredicateRegistry): ConditionField {
  const blank = { index, path: "", is: "", to: "", toKind: "none" as const, not: false };
  if (isAnyDraft(draft)) {
    return { ...blank, sentence: whenText([draft], predicates), saves: draft, fixed: draft };
  }
  if (isTreeDraft(draft)) {
    const tree = groupFieldOf(draft.tree, predicates);
    const words = wordsOf(tree, predicates);
    // The engine reads the words back: what it refuses is what the cell would be refused for.
    const problem =
      treeProblem(tree) ??
      (words === undefined ? "finish every condition" : whenProblems([{ expression: words }], predicates));
    return {
      ...blank,
      is: CONSTRUCTOR,
      tree,
      ...(problem === undefined && words !== undefined
        ? { sentence: `when ${words}`, saves: { expression: words } }
        : { toError: (problem ?? "").replace(/^when\[0\] /, "") }),
    };
  }
  if (isExpressionDraft(draft)) {
    const problem = whenProblems([draft], predicates) ?? "";
    return { ...blank, is: CONSTRUCTOR, expression: draft.expression, toError: problem.replace(/^when\[0\] /, "") };
  }
  const facts = testFactsOf(draft, predicates);
  return {
    ...blank,
    ...draft,
    ...facts,
    ...(facts.test === undefined ? {} : { sentence: testText(facts.test, predicates), saves: facts.test }),
  };
}

/** One step of building the constructor, at a place in the tree ("" the root, "1.0" a nested part). */
export type TreeEdit =
  | { set: Partial<TestDraft> }
  | { group: Partial<Pick<GroupDraft, "join" | "not">> }
  | { add: "test" | "group" }
  | "remove";

/** The tree with one edit applied at `at`, immutably; an edit that does not fit its node leaves the tree as it is. */
export function editTree(group: GroupDraft, at: string, edit: TreeEdit): GroupDraft {
  const steps = at === "" ? [] : at.split(".").map(Number);
  const editNode = (node: NodeDraft, [head, ...rest]: number[]): NodeDraft | undefined => {
    if (head === undefined) {
      if (edit === "remove") return undefined;
      if ("set" in edit) return isGroup(node) ? node : { ...node, ...edit.set };
      if (!isGroup(node)) return node;
      if ("group" in edit) return { ...node, ...edit.group };
      return { ...node, parts: [...node.parts, edit.add === "test" ? EMPTY_CONDITION : emptyGroup()] };
    }
    if (!isGroup(node)) return node;
    const parts = node.parts.flatMap((part, index) => {
      if (index !== head) return [part];
      const edited = editNode(part, rest);
      return edited === undefined ? [] : [edited];
    });
    return { ...node, parts };
  };
  const edited = editNode(group, steps);
  return edited === undefined || !isGroup(edited) ? group : edited;
}

/**
 * The rows as the template's `when`: what each holding row saves, in order
 * — blank rows and rows whose value is refused left out (the form gates on
 * the latter, so by the time a save runs there is none); undefined when
 * nothing is left (the widget always shows).
 */
export const whenOfConditions = (conditions: readonly ConditionField[]): When | undefined => {
  const members = conditions.flatMap((condition) => (condition.saves === undefined ? [] : [condition.saves]));
  return members.length > 0 ? members : undefined;
};
