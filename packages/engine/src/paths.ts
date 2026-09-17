/**
 * Path tooling for view-model trees and store autocomplete. Reading and
 * writing a path is @wirework/schema's (`getPath`, `setPath`, `deletePath`
 * — one rule set shared with the store); re-exported here for hosts.
 */
import {
  CONFIG_ROOTS,
  FORBIDDEN_SEGMENTS,
  isPlainObject,
  type ReadableStore,
  type Validator,
} from "@wirework/schema";

export { deletePath, getPath, setPath } from "@wirework/schema";

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
    result[key] = deepMerge(Object.hasOwn(base, key) ? base[key] : undefined, value);
  }
  return result;
}
