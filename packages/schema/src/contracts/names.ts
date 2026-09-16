/**
 * Identity grammar and reserved names — ONE source of truth for the whole
 * system (team-tiger: the kebab pattern used to live in five files and the
 * prototype blocklist in three, so a security constant could drift in one
 * package only).
 */

/** Widget types, event names, layout-engine names, contract kinds. */
export const KEBAB_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Action names: kebab, optionally namespaced ("runs/load", "nav/go") as
 * doc/actions-design.md requires. One namespace segment, no nesting.
 */
export const ACTION_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?$/;

/** Path segments that would address the prototype chain instead of own data. */
export const FORBIDDEN_SEGMENTS: ReadonlySet<string> = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

/**
 * Store roots holding CONFIGURATION, not application data: the view-model
 * trees. Widgets bind to data and reactions write data; configuration is
 * changed only by editors, through `Store.setConfig` (team-tiger blocker —
 * otherwise a `set` reaction could blank the page it is rendered on).
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
