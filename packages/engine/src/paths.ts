/** Dot-path helpers for resolving view-model references and store tooling. */
import { CONFIG_ROOTS, FORBIDDEN_SEGMENTS, isConfigPath, type ReadableStore, type Validator } from "@wirework/schema";

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
 * numeric segments; forbidden segments, and any key `storePathSchema`
 * would reject (dots, whitespace), are skipped — a suggestion the schema
 * refuses is worse than no suggestion.
 */
export function collectPaths(root: unknown, maxDepth = 8): string[] {
  const paths: string[] = [];
  const walk = (value: unknown, prefix: string, depth: number): void => {
    if (depth >= maxDepth || value === null || typeof value !== "object") return;
    const entries: readonly (readonly [string, unknown])[] = Array.isArray(value)
      ? value.map((element, index) => [String(index), element] as const)
      : Object.entries(value);
    for (const [key, child] of entries) {
      if (FORBIDDEN_SEGMENTS.has(key) || key === "" || /[.\s]/.test(key)) continue;
      const path = prefix === "" ? key : `${prefix}.${key}`;
      paths.push(path);
      walk(child, path, depth + 1);
    }
  };
  walk(root, "", 0);
  return paths;
}

/**
 * Existing DATA paths whose CURRENT value satisfies the given validator —
 * the autocomplete source for binding a typed input port
 * (doc/widget-io-design.md). Configuration trees are excluded: a binding
 * may not address the view models (see `storePathSchema`), so offering
 * them would only produce templates the widget then rejects. A live value
 * may still change shape later; this is a tooling aid, not a guarantee.
 */
export function compatibleStorePaths(
  store: ReadableStore,
  validator: Validator<unknown>,
): string[] {
  const data = Object.fromEntries(
    Object.entries(store.snapshot()).filter(([root]) => !CONFIG_ROOTS.includes(root)),
  );
  return collectPaths(data).filter((path) => {
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
export function deletePath<T extends object>(root: T, path: string | readonly string[]): T {
  const segments = segmentsOf(path);
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
 * Segments of a path. Pass an ARRAY when a segment may itself contain a dot
 * (template names, widget keys): joining first and splitting later writes
 * to the wrong branch and loses the edit.
 */
function segmentsOf(path: string | readonly string[]): string[] {
  return typeof path === "string" ? path.split(".") : [...path];
}

/**
 * Immutable write at a dot path (or explicit segments) into a view-model
 * tree: clones the containers along the path, creates missing ones, never
 * touches the prototype chain. Arrays ARE traversed by numeric segment and
 * stay arrays; a non-numeric segment through an array is refused.
 */
export function setPath<T extends object>(root: T, path: string | readonly string[], value: unknown): T {
  const segments = segmentsOf(path);
  const shown = segments.join(".");
  const assign = (container: unknown, index: number): unknown => {
    const key = segments[index];
    if (key === undefined || key === "" || FORBIDDEN_SEGMENTS.has(key)) {
      throw new Error(`Refusing to write path "${shown}": bad segment ${JSON.stringify(key)}`);
    }
    const last = index === segments.length - 1;
    if (Array.isArray(container)) {
      if (!/^\d+$/.test(key)) {
        throw new Error(`Refusing to write path "${shown}": segment "${key}" through an array needs a numeric index`);
      }
      const next = [...container];
      next[Number(key)] = last ? value : assign(next[Number(key)], index + 1);
      return next;
    }
    const base: Record<string, unknown> = isPlainObject(container) ? { ...container } : {};
    base[key] = last ? value : assign(base[key], index + 1);
    return base;
  };
  return assign(root, 0) as T;
}

/** True when a path addresses a configuration tree (re-exported for hosts). */
export { isConfigPath };
