/**
 * Dot paths — the ONE walker for plain data trees, shared by the store, the
 * engine and widgets (team-tiger review: five hand-written walkers
 * disagreed about arrays, primitives and empty segments, and one of them
 * lost an edit).
 *
 * Rules:
 *  - a path is a dot-separated string, or explicit segments when a segment
 *    may itself contain a dot (a template name like "v1.0");
 *  - reads see OWN properties only, and an array only by canonical index
 *    ("0", "12" — never "01" or "length");
 *  - writes clone the containers along the path and share everything else;
 *  - a MISSING container is created as an object, or as an array when the
 *    next segment is "0": `rows.0.name` starts a list, while
 *    `byId.123456.name` must not allocate 123 457 array slots;
 *  - writing through a primitive, a non-index segment through an array,
 *    and empty or prototype segments throw.
 */
import { FORBIDDEN_SEGMENTS } from "./contracts/names";

export type PathInput = string | readonly string[];

const INDEX = /^(0|[1-9]\d*)$/;

/** A canonical array index: "0", "12" — not "01", "-1" or "length". */
export const isIndexSegment = (segment: string): boolean => INDEX.test(segment);

/** An object literal (or JSON) value — not an array, class instance or null. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** The segments of a path, unchecked. */
export const pathSegments = (path: PathInput): string[] =>
  typeof path === "string" ? path.split(".") : [...path];

/** The segments of a path a write may use; throws naming the bad segment. */
export function checkedSegments(path: PathInput): string[] {
  const segments = pathSegments(path);
  const shown = segments.join(".");
  if (segments.length === 0 || segments.includes("")) {
    throw new Error(`Path "${shown}" has an empty segment`);
  }
  const forbidden = segments.find((segment) => FORBIDDEN_SEGMENTS.has(segment));
  if (forbidden !== undefined) {
    throw new Error(`Path "${shown}" has a forbidden segment "${forbidden}"`);
  }
  return segments;
}

/** The value at a path, or undefined when any step is missing. Never throws. */
export function getPath(root: unknown, path: PathInput): unknown {
  let current = root;
  for (const segment of pathSegments(path)) {
    if (current === null || typeof current !== "object" || FORBIDDEN_SEGMENTS.has(segment)) return undefined;
    const present = Array.isArray(current) ? isIndexSegment(segment) : Object.hasOwn(current, segment);
    if (!present) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Immutable write: a new root with `value` at the path. */
export function setPath<T>(root: T, path: PathInput, value: unknown): T {
  const segments = checkedSegments(path);
  const shown = segments.join(".");

  const containerFor = (existing: unknown, index: number): unknown => {
    if (existing !== null && typeof existing === "object") return existing;
    if (existing !== undefined && existing !== null) {
      const at = segments.slice(0, index + 1).join(".");
      throw new Error(`Cannot write "${shown}": "${at}" holds a ${typeof existing}, which writing through it would replace`);
    }
    return segments[index + 1] === "0" ? [] : {};
  };

  const assign = (container: unknown, index: number): unknown => {
    const key = segments[index] ?? "";
    const last = index === segments.length - 1;
    const child = (existing: unknown): unknown =>
      last ? value : assign(containerFor(existing, index), index + 1);
    if (Array.isArray(container)) {
      if (!isIndexSegment(key)) {
        throw new Error(`Cannot write "${shown}": segment "${key}" through an array needs a numeric index`);
      }
      const next = [...container];
      next[Number(key)] = child(next[Number(key)]);
      return next;
    }
    const next: Record<string, unknown> = { ...(container as Record<string, unknown> | undefined) };
    next[key] = child(Object.hasOwn(next, key) ? next[key] : undefined);
    return next;
  };

  return assign(root, 0) as T;
}

/** Immutable delete: the same root when nothing is at the path. */
export function deletePath<T>(root: T, path: PathInput): T {
  const segments = checkedSegments(path);

  const drop = (container: unknown, index: number): unknown => {
    if (container === null || typeof container !== "object") return container;
    const key = segments[index] ?? "";
    const last = index === segments.length - 1;
    if (Array.isArray(container)) {
      const at = Number(key);
      if (!isIndexSegment(key) || at >= container.length) return container;
      if (last) return container.filter((_, position) => position !== at);
      const child = drop(container[at], index + 1);
      return child === container[at] ? container : container.map((item, position) => (position === at ? child : item));
    }
    const record = container as Record<string, unknown>;
    if (!Object.hasOwn(record, key)) return container;
    if (last) {
      const { [key]: _removed, ...rest } = record;
      return rest;
    }
    const child = drop(record[key], index + 1);
    return child === record[key] ? container : { ...record, [key]: child };
  };

  return drop(root, 0) as T;
}
