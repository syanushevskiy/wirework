/**
 * Path tooling on top of @wirework/schema's `getPath` / `setPath` /
 * `deletePath` (the one rule set, shared with the store): path enumeration
 * for autocomplete, generated paths for a builder, and the overlay merge.
 */
import {
  CONFIG_ROOTS,
  FORBIDDEN_SEGMENTS,
  isPlainObject,
  type ReadableStore,
  type Validator,
} from "@wirework/schema";

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
 * The name a widget gets in GENERATED paths: its contract kind — else its
 * type without the first word, a vendor prefix ("antd-counter" -> "counter")
 * — in camelCase ("multi-select" -> "multiSelect"), so it reads as one
 * path segment.
 */
export function widgetPathName(definition: { kind?: string | undefined; type: string }): string {
  const words = (definition.kind ?? definition.type).split("-").filter(Boolean);
  const named = definition.kind === undefined && words.length > 1 ? words.slice(1) : words;
  return named.map((word, index) => (index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)).join("");
}

/**
 * Every store path the view models already BIND: the `inputs` of every
 * widget template and the targets of its `set` reactions. What a builder
 * needs to know to generate a path nobody uses yet.
 */
export function boundPaths(viewModels: { widgets?: unknown } | undefined): string[] {
  const paths: string[] = [];
  const walk = (node: unknown, depth: number): void => {
    if (!isPlainObject(node) || depth > 8) return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "inputs" && isPlainObject(value)) {
        paths.push(...Object.values(value).filter((path): path is string => typeof path === "string"));
      } else if (key === "on" && isPlainObject(value)) {
        for (const reactions of Object.values(value)) {
          for (const reaction of Array.isArray(reactions) ? reactions : []) {
            const target = (reaction as { set?: unknown } | null)?.set;
            if (typeof target === "string") paths.push(target);
          }
        }
      } else {
        walk(value, depth + 1);
      }
    }
  };
  walk(viewModels?.widgets, 0);
  return paths;
}

/**
 * GENERATED store paths for a widget a builder is about to place
 * (doc/builder-user-needs.md, W12): `<page>.<name>.<port>` for EVERY input
 * port, so nobody has to type a path to get started — a builder offers them
 * as defaults the user can change. `<name>` is the widget's path name,
 * numbered from the second instance on (`refresher`, `refresher2`, …): the
 * first under which no path in `taken` lives. `<port>` is the port's name,
 * unless the port declares a `suggestedName` — a table's `rows` port is
 * suggested `<…>.data`, where loaders put rows. A generated path need not
 * exist in the store: a binding may name state a reaction will write.
 */
export function suggestedInputPaths(
  page: string,
  definition: { kind?: string | undefined; type: string; io: { inputs: Record<string, unknown> } },
  taken: Iterable<string>,
): Record<string, string> {
  const used = [...taken];
  const base = widgetPathName(definition);
  const isFree = (name: string): boolean => {
    const root = `${page}.${name}`;
    return !used.some((path) => path === root || path.startsWith(`${root}.`));
  };
  let name = base;
  for (let instance = 2; !isFree(name); instance += 1) name = `${base}${instance}`;
  return Object.fromEntries(
    Object.entries(definition.io.inputs).map(([port, declared]) => {
      const suggested = (declared as { suggestedName?: unknown } | null)?.suggestedName;
      return [port, `${page}.${name}.${typeof suggested === "string" && suggested !== "" ? suggested : port}`];
    }),
  );
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
