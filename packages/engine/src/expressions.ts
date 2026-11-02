/**
 * The constructor (doc/conditions-design.md): a condition written in words,
 * parsed against the predicate registry into a tree the interpreter walks.
 *
 *   expression := or
 *   or         := and ("or" and)*
 *   and        := unary ("and" unary)*
 *   unary      := "not" unary | "(" expression ")" | test
 *   test       := PATH PHRASE [literal ("," literal)*]
 *   literal    := "text" | number | true | false
 *
 * A PHRASE is a registered predicate's phrase, matched word for word
 * ("is greater than", "can be retried"), the longest first. The leaves are
 * the same tests a `when` list holds; only `and`, `or`, `not` and the
 * parentheses are new — composition of named checks, never an expression
 * over values. A parse that fails is a sentence a page builder can act on.
 */
import { argumentKind, type AnyPredicateDefinition, type WhenTest } from "@wirework/schema";

/**
 * A parsed condition: a test, or `all`, `any`, `unless` over conditions.
 * (`unless`, not `not`: a leaf test carries its own `not` flag.)
 */
export type ConditionNode = WhenTest | { all: ConditionNode[] } | { any: ConditionNode[] } | { unless: ConditionNode };

export type ParsedExpression = { node: ConditionNode; problem?: undefined } | { node?: undefined; problem: string };

/** What the registry gives a parser: the predicates by name. */
export interface PhraseSource {
  list(): readonly AnyPredicateDefinition[];
}

const TOKEN = /\s*(\(|\)|,|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|[^\s(),"]+)/y;
const KEYWORDS = new Set(["and", "or", "not"]);

/** The text as tokens, or why it cannot be split (a quote never closed). */
function tokenize(text: string): string[] | string {
  const tokens: string[] = [];
  TOKEN.lastIndex = 0;
  let match = TOKEN.exec(text);
  let end = 0;
  while (match !== null) {
    tokens.push(match[1] ?? "");
    end = TOKEN.lastIndex;
    match = TOKEN.exec(text);
  }
  return text.slice(end).trim() === "" ? tokens : `cannot read ${JSON.stringify(text.slice(end).trim())}`;
}

const isLiteral = (token: string): boolean =>
  token.startsWith('"') || /^-?\d+(?:\.\d+)?$/.test(token) || token === "true" || token === "false";

const literalOf = (token: string): string | number | boolean =>
  token.startsWith('"')
    ? (JSON.parse(token) as string)
    : token === "true" || token === "false"
      ? token === "true"
      : Number(token);

class Failure extends Error {}

/**
 * Parses one expression against the predicates' phrases. The result is
 * cached per registry and text: `holds` runs on every store change.
 */
export function parseExpression(text: string, predicates: PhraseSource): ParsedExpression {
  const tokens = tokenize(text);
  if (typeof tokens === "string") return { problem: tokens };
  // Longest phrase first, so "is one of" wins over a predicate phrased "is".
  const phrased = predicates
    .list()
    .map((predicate) => ({ predicate, words: predicate.phrase.split(" ") }))
    .sort((a, b) => b.words.length - a.words.length);
  let at = 0;
  const peek = (): string | undefined => tokens[at];
  const take = (): string => tokens[at++] ?? "";
  const fail = (message: string): never => {
    throw new Failure(message);
  };

  const test = (): WhenTest => {
    const path = take();
    if (path === "" || KEYWORDS.has(path) || isLiteral(path) || path === "(" || path === ")" || path === ",") {
      return fail(
        path === "" ? "a condition is missing at the end" : `expected a store path, got ${JSON.stringify(path)}`,
      );
    }
    const found = phrased.find(({ words }) => words.every((word, index) => tokens[at + index] === word));
    if (!found) {
      const got = tokens.slice(at, at + 3).join(" ");
      return fail(
        `expected a check after "${path}"${got === "" ? "" : `, got ${JSON.stringify(got)}`} (checks: ${phrased.map(({ predicate }) => predicate.phrase).join(", ")})`,
      );
    }
    at += found.words.length;
    const { predicate } = found;
    if (predicate.argument === undefined) return { path, is: predicate.name };
    const literals: (string | number | boolean)[] = [];
    do {
      const token = take();
      if (!isLiteral(token)) {
        return fail(
          `expected a value after "${predicate.phrase}"${token === "" ? "" : `, got ${JSON.stringify(token)}`}`,
        );
      }
      literals.push(literalOf(token));
    } while (peek() === "," && take() === ",");
    const to = argumentKind(predicate.argument).kind === "list" || literals.length > 1 ? literals : literals[0];
    return { path, is: predicate.name, to };
  };

  const unary = (): ConditionNode => {
    if (peek() === "not") {
      take();
      return { unless: unary() };
    }
    if (peek() === "(") {
      take();
      const inner = or();
      if (take() !== ")") return fail('missing ")"');
      return inner;
    }
    return test();
  };
  const and = (): ConditionNode => {
    const parts = [unary()];
    while (peek() === "and") {
      take();
      parts.push(unary());
    }
    return parts.length === 1 ? (parts[0] ?? fail("empty")) : { all: parts };
  };
  const or = (): ConditionNode => {
    const parts = [and()];
    while (peek() === "or") {
      take();
      parts.push(and());
    }
    return parts.length === 1 ? (parts[0] ?? fail("empty")) : { any: parts };
  };

  try {
    const node = or();
    if (at < tokens.length) return { problem: `unexpected ${JSON.stringify(tokens[at])}` };
    return { node };
  } catch (error) {
    if (error instanceof Failure) return { problem: error.message };
    throw error;
  }
}

/** Every leaf test of a parsed condition. */
export function leavesOf(node: ConditionNode): WhenTest[] {
  if ("all" in node) return node.all.flatMap(leavesOf);
  if ("any" in node) return node.any.flatMap(leavesOf);
  if ("unless" in node) return leavesOf(node.unless);
  return [node];
}

/** Whether a parsed condition holds, given how one test is decided. */
export function evaluate(node: ConditionNode, test: (leaf: WhenTest) => boolean): boolean {
  if ("all" in node) return node.all.every((part) => evaluate(part, test));
  if ("any" in node) return node.any.some((part) => evaluate(part, test));
  if ("unless" in node) return !evaluate(node.unless, test);
  return test(node);
}
