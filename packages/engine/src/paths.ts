/** Dot-path helpers for resolving view-model references and store tooling. */
import type { ReadableStore, Validator } from "@wirework/schema";

/** Segments that would touch the prototype chain instead of own data. */
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

export function getPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    if (FORBIDDEN_SEGMENTS.has(segment) || !Object.hasOwn(current, segment)) {
      return undefined; // own properties only — never the prototype chain
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Enumerate every dot path reachable in a state tree (branches AND leaves),
 * for tooling such as path autocomplete. Array elements are addressed by
 * numeric segments; forbidden segments are skipped.
 */
export function collectPaths(root: unknown, maxDepth = 8): string[] {
  const paths: string[] = [];
  const walk = (value: unknown, prefix: string, depth: number): void => {
    if (depth >= maxDepth || value === null || typeof value !== "object") return;
    const entries: readonly (readonly [string, unknown])[] = Array.isArray(value)
      ? value.map((element, index) => [String(index), element] as const)
      : Object.entries(value);
    for (const [key, child] of entries) {
      if (FORBIDDEN_SEGMENTS.has(key) || key.includes(".") || key === "") continue;
      const path = prefix === "" ? key : `${prefix}.${key}`;
      paths.push(path);
      walk(child, path, depth + 1);
    }
  };
  walk(root, "", 0);
  return paths;
}

/**
 * Existing store paths whose CURRENT value satisfies the given validator —
 * the autocomplete source for binding a typed input port
 * (doc/widget-io-design.md). A live value may still change shape later;
 * this is a tooling aid, not a runtime guarantee.
 */
export function compatibleStorePaths(
  store: ReadableStore,
  validator: Validator<unknown>,
): string[] {
  return collectPaths(store.snapshot()).filter((path) => {
    try {
      validator.parse(store.get(path));
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Deep merge for user-settings overlays: plain objects merge recursively,
 * everything else (arrays, primitives) is replaced by the overlay value.
 */
export function deepMerge(base: unknown, overlay: unknown): unknown {
  if (overlay === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(overlay)) return overlay;
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    if (FORBIDDEN_SEGMENTS.has(key)) continue; // no pollution via JSON overlays
    result[key] = deepMerge(base[key], value);
  }
  return result;
}

/** Immutable delete of a dot path; missing paths return the same tree. */
export function deletePath<T extends object>(root: T, path: string): T {
  const segments = path.split(".");
  const drop = (container: unknown, index: number): unknown => {
    if (!isPlainObject(container)) return container;
    const key = segments[index];
    if (key === undefined || !Object.hasOwn(container, key)) return container;
    if (index === segments.length - 1) {
      const { [key]: _removed, ...rest } = container;
      return rest;
    }
    return { ...container, [key]: drop(container[key], index + 1) };
  };
  return drop(root, 0) as T;
}

/**
 * Immutable write at a dot path into a plain-object tree: clones the
 * containers along the path, creates missing ones, never touches the
 * prototype chain. Arrays are not traversed (view-model trees are keyed).
 */
export function setPath<T extends object>(root: T, path: string, value: unknown): T {
  const segments = path.split(".");
  const assign = (container: unknown, index: number): Record<string, unknown> => {
    const key = segments[index];
    if (key === undefined || key === "" || FORBIDDEN_SEGMENTS.has(key)) {
      throw new Error(`Refusing to write path "${path}": bad segment ${JSON.stringify(key)}`);
    }
    const base: Record<string, unknown> = isPlainObject(container) ? { ...container } : {};
    base[key] = index === segments.length - 1 ? value : assign(base[key], index + 1);
    return base;
  };
  return assign(root, 0) as T;
}
