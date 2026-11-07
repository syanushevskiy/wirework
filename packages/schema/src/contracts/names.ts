/**
 * Identity grammar and reserved names — ONE source of truth for the whole
 * system: the kebab pattern once lived in five files and the prototype
 * blocklist in three, so a security constant could drift in one package
 * only.
 */

/** Widget types, event names, layout-engine names, contract kinds. */
export const KEBAB_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Action names: kebab, optionally namespaced ("runs/load", "nav/go") as
 * doc/actions-design.md requires. One namespace segment, no nesting.
 */
export const ACTION_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?$/;

/**
 * Predicate names (doc/conditions-design.md): the action grammar — the
 * standard checks are plain ("equal", "one-of"), a host's own carry its
 * namespace ("runs/retryable").
 */
export const PREDICATE_NAME = ACTION_NAME;
/**
 * Role names (doc/roles-design.md): the action grammar — `admin`,
 * `ops/on-call` — so a role is a word in a condition's sentence and a key
 * of `viewModels.roles`. What the names mean is the host's: they come from
 * its session, and may as well be permissions.
 */
export const ROLE_NAME = ACTION_NAME;
/** An appearance's name (`fade`, `slide-up`, a host's `drop`): kebab-case, the suffix of its `@keyframes ww-<name>`. */
export const APPEARANCE_NAME = KEBAB_NAME;

/**
 * One segment of a dotted store path: anything but a dot, whitespace or
 * nothing. The ONE grammar — the schema (`storePathSchema`), the store's
 * write check (`checkedSegments`), path enumeration and the generated-path
 * checks all use it, so the store can never accept a path the schema
 * refuses or the other way round.
 */
export const PATH_SEGMENT = /^[^.\s]+$/;

/** A dotted store path: one or more `PATH_SEGMENT`s joined by dots. */
export const STORE_PATH = /^[^.\s]+(?:\.[^.\s]+)*$/;

/** Path segments that would address the prototype chain instead of own data. */
export const FORBIDDEN_SEGMENTS: ReadonlySet<string> = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Store roots holding CONFIGURATION, not application data: the view-model
 * trees. Widgets bind to data and reactions write data; configuration is
 * changed only by editors, through `Store.setConfig` — otherwise a `set`
 * reaction could blank the page it is rendered on.
 */
export const CONFIG_ROOTS: readonly string[] = ["viewModels", "userViewModels"];

/** True when a dot path addresses a configuration tree. */
export function isConfigPath(path: string): boolean {
  const root = path.split(".")[0];
  return root !== undefined && CONFIG_ROOTS.includes(root);
}

/** True when a dot path contains a segment that addresses the prototype chain. */
export function hasForbiddenSegment(path: string): boolean {
  return path.split(".").some((segment) => FORBIDDEN_SEGMENTS.has(segment));
}
