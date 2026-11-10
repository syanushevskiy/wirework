/**
 * What a builder CALLS the things it creates — the page view it edits, a
 * placed widget's template and group, the next cell id — and how a placed
 * container starts. Shared by the builder hook and the edit ops, which is
 * why it is a module of its own (the ops are used by the hook too).
 */
import type { AnyLayoutEngine, AnyWidgetDefinition } from "@wirework/schema";

/** What a builder calls the things it creates. A host may name them differently. */
export interface BuilderNaming {
  /** The page template the builder edits (`pages.<page>.<pageView>`). */
  pageView: string;
  /** The template name a placed widget gets (`widgets.<modelGroup>.<cellId>.<widgetTemplate>`). */
  widgetTemplate: string;
  /** The group under `viewModels.widgets` that holds placed widgets' templates. */
  modelGroup: string;
  /** The next free cell id, given every id and template name the page already uses. */
  cellId: (taken: readonly string[]) => string;
}

/**
 * Ids of the form `<prefix>-1`, `<prefix>-2`, … — derived from what is
 * TAKEN rather than from a counter, because a host may have applied a tree
 * that already holds some.
 */
export function numberedIds(prefix: string): (taken: readonly string[]) => string {
  const head = `${prefix}-`;
  return (taken) => {
    const used = taken.flatMap((name) => {
      const rest = name.startsWith(head) ? name.slice(head.length) : "";
      return /^\d+$/.test(rest) ? [Number(rest)] : [];
    });
    return `${head}${Math.max(0, ...used) + 1}`;
  };
}

/** The names a builder uses unless the host says otherwise. */
export const DEFAULT_BUILDER_NAMING: BuilderNaming = {
  pageView: "default",
  widgetTemplate: "default",
  modelGroup: "custom",
  cellId: numberedIds("custom"),
};

/** Where a builder's widget templates live — the prefix that marks a model as builder-owned. */
export const modelNamespaceOf = (naming: BuilderNaming): string => `widgets.${naming.modelGroup}`;

/**
 * A placed CONTAINER starts with its layouts EMPTY, on the engine of the
 * layout it is placed in: a card's `content`, the `content` of every item
 * of a tabs widget's `tabs` (the form's entries, else the setting's
 * defaults) — and an item an EDIT added gets one the same way. The form
 * never asks for a layout; this is where it comes from.
 */
export function withEmptyLayouts(
  definition: AnyWidgetDefinition | undefined,
  template: Record<string, unknown>,
  engine: AnyLayoutEngine,
): Record<string, unknown> {
  const contains = definition?.contains ?? [];
  if (!definition || contains.length === 0) return template;
  let parsed: Record<string, unknown>;
  try {
    parsed = definition.viewModel.parse(template) as Record<string, unknown>;
  } catch {
    return template;
  }
  const started = (held: unknown): unknown =>
    Array.isArray(held)
      ? held.map((item: unknown) =>
          item !== null && typeof item === "object" && !("content" in item)
            ? { ...item, content: engine.empty() }
            : item,
        )
      : (held ?? engine.empty());
  return { ...template, ...Object.fromEntries(contains.map((name) => [name, started(parsed[name])])) };
}
