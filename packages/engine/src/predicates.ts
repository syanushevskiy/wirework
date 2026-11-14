/**
 * Predicates and conditions (doc/ADR/0008-conditions.md): the fifth
 * extension point. A widget's `when` is a list of tests over store paths —
 * every test names a predicate from this registry, which holds the
 * standard eight from the start and whatever the host registers. `holds`
 * evaluates a condition against a `read` the caller supplies (a cell reads
 * the store; a row action, one day, the row), `whenPaths` says what to
 * subscribe to, `whenText` is the ONE wording of a condition (the builder's
 * summary, the edit-mode note, the problem messages) and `whenProblems`
 * what resolve and boot validation report. A member written in words (the
 * constructor, expressions.ts) is parsed once per registry and text.
 */
import {
  PREDICATE_NAME,
  standardPredicates,
  valueText,
  type AnyPredicateDefinition,
  type When,
  type WhenAny,
  type WhenExpression,
  type WhenMember,
  type WhenTest,
} from "@wirework/schema";
import { evaluate, leavesOf, parseExpression, type ConditionNode, type ParsedExpression } from "./expressions";
import { problemText } from "./messages";
import { createNamedRegistry, type NamedRegistry } from "./named-registry";

export type PredicateRegistry = NamedRegistry<AnyPredicateDefinition>;

/** A registry with the standard predicates (`@wirework/schema`) already in it; the host adds its own, then seals it. */
export function createPredicates(): PredicateRegistry {
  const registry = createNamedRegistry<AnyPredicateDefinition>({
    label: "Predicate",
    keyOf: (predicate) => predicate.name,
    pattern: PREDICATE_NAME,
    invariants: [
      (predicate) => (typeof predicate.test !== "function" ? "has no test" : undefined),
      (predicate) => (typeof predicate.phrase !== "string" || predicate.phrase === "" ? "has no phrase" : undefined),
      (predicate) =>
        typeof predicate.description !== "string" || predicate.description === "" ? "has no description" : undefined,
      (predicate) =>
        predicate.argument !== undefined && typeof predicate.argument.parse !== "function"
          ? "has an argument that is not a validator"
          : undefined,
    ],
  });
  for (const predicate of standardPredicates) registry.register(predicate);
  return registry;
}

/** The standard predicates alone, sealed — what a caller without a registry of its own evaluates against. */
export const STANDARD_PREDICATES: PredicateRegistry = createPredicates();
STANDARD_PREDICATES.seal();

const isAny = (member: WhenMember): member is WhenAny => "any" in member;
const isExpression = (member: WhenMember): member is WhenExpression => "expression" in member;

/** Parses once per registry and text: `holds` runs on every store change. */
const parsedExpressions = new WeakMap<PredicateRegistry, Map<string, ParsedExpression>>();

/** A constructor member parsed against the registry, from the cache when it has been before. */
export function parsedExpression(member: WhenExpression, predicates: PredicateRegistry): ParsedExpression {
  const cache = parsedExpressions.get(predicates) ?? new Map<string, ParsedExpression>();
  parsedExpressions.set(predicates, cache);
  const cached = cache.get(member.expression);
  if (cached !== undefined) return cached;
  const parsed = parseExpression(member.expression, predicates);
  cache.set(member.expression, parsed);
  return parsed;
}

/** One member as a tree: a test as itself, `any` as a node, the constructor as parsed — nothing when it cannot be read. */
function nodeOf(member: WhenMember, predicates: PredicateRegistry): ConditionNode | undefined {
  if (isExpression(member)) return parsedExpression(member, predicates).node;
  return isAny(member) ? { any: member.any } : member;
}

/** Every store path a condition reads — what to subscribe to. */
export const whenPaths = (
  when: When | undefined,
  predicates: PredicateRegistry = STANDARD_PREDICATES,
): readonly string[] =>
  (when ?? []).flatMap((member) => {
    const node = nodeOf(member, predicates);
    return node === undefined ? [] : leavesOf(node).map((test) => test.path);
  });

/**
 * Whether the condition holds for what `read` gives at each path. No
 * condition always holds; an unknown predicate never does, and neither
 * does a constructor that cannot be read (resolve and boot validation
 * reported both). A predicate that throws throws here: a host bug, for the
 * caller's boundary.
 */
export function holds(
  when: When | undefined,
  read: (path: string) => unknown,
  predicates: PredicateRegistry = STANDARD_PREDICATES,
): boolean {
  const test = ({ path, is, to, not }: WhenTest): boolean =>
    (predicates.get(is)?.test(read(path), to) ?? false) !== (not === true);
  return (when ?? []).every((member) => {
    const node = nodeOf(member, predicates);
    return node !== undefined && evaluate(node, test);
  });
}

/** A literal as a sentence shows it, and as the constructor reads it back: text quoted, a list as its items, anything else as it is. */
export const literalText = (to: unknown): string =>
  Array.isArray(to) ? to.map(literalText).join(", ") : typeof to === "string" ? JSON.stringify(to) : valueText(to);

/** One test as it reads: "run.error is empty", "runs.total is greater than 10" — "unless" before a negated one. */
export function testText(test: WhenTest, predicates: PredicateRegistry = STANDARD_PREDICATES): string {
  const phrase = predicates.get(test.is)?.phrase ?? `is ${JSON.stringify(test.is)}`;
  const sentence = test.to === undefined ? `${test.path} ${phrase}` : `${test.path} ${phrase} ${literalText(test.to)}`;
  return test.not === true ? `unless ${sentence}` : `when ${sentence}`;
}

/** One member as it reads: a test's sentence, "one of" the any's, the constructor's own words. */
const memberText = (member: WhenMember, predicates: PredicateRegistry): string =>
  isExpression(member)
    ? `when ${member.expression.trim()}`
    : isAny(member)
      ? `when one of: ${member.any.map((test) => testText(test, predicates)).join(" or ")}`
      : testText(member, predicates);

/**
 * The condition as ONE sentence — "unless run.error is empty, when
 * app.permissions.role is one of "admin", "owner"" — the same words in the
 * builder, on a hidden cell in edit mode and in a problem message.
 */
export const whenText = (when: When, predicates: PredicateRegistry = STANDARD_PREDICATES): string =>
  when.map((member) => memberText(member, predicates)).join(", ");

/**
 * What is wrong with one test — an unknown predicate, a `to` it refuses,
 * takes none of, or lacks — as a list of zero or one sentence, so the
 * callers flatten.
 */
function testProblems(at: string, test: WhenTest, predicates: PredicateRegistry): string[] {
  const predicate = predicates.get(test.is);
  const name = JSON.stringify(test.is);
  if (!predicate) return [`${at} uses an unknown predicate ${name} (registered: ${predicates.keys().join(", ")})`];
  if (predicate.argument === undefined) {
    return test.to === undefined ? [] : [`${at} gives ${name} a value, and it takes none`];
  }
  if (test.to === undefined) return [`${at} gives ${name} no value, and it takes one`];
  try {
    predicate.argument.parse(test.to);
    return [];
  } catch (error) {
    return [`${at} gives ${name} a value it refuses: ${problemText(error)}`];
  }
}

/** What is wrong with one member: a constructor that cannot be read, else every leaf's problems. */
function memberProblems(at: string, member: WhenMember, predicates: PredicateRegistry): string[] {
  if (isExpression(member)) {
    const parsed = parsedExpression(member, predicates);
    if (parsed.problem !== undefined) return [`${at} cannot be read: ${parsed.problem}`];
    return leavesOf(parsed.node).flatMap((test) => testProblems(at, test, predicates));
  }
  return isAny(member)
    ? member.any.flatMap((test, inner) => testProblems(`${at}.any[${inner}]`, test, predicates))
    : testProblems(at, member, predicates);
}

/**
 * Everything wrong with a parsed condition, as one sentence — or undefined.
 * The schema checked the shape; this checks the names and the literals
 * against the registry, for resolve and boot validation alike.
 */
export function whenProblems(
  when: When | undefined,
  predicates: PredicateRegistry = STANDARD_PREDICATES,
): string | undefined {
  const problems = (when ?? []).flatMap((member, index) => memberProblems(`when[${index}]`, member, predicates));
  return problems.length > 0 ? problems.join("; ") : undefined;
}
