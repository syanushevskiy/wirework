/**
 * Layout-engine registry — the second extension point beside widgets.
 * Registration is strict and loud, like widgets: a plugin that registers
 * has a unique kebab-case name, a template validator, every layout
 * operation, and a renderer.
 */
import { KEBAB_NAME, pageViewModelSchema, type AnyLayoutEngine, type PageViewModel } from "@wirework/schema";
import { errorText, issuesText } from "./messages";
import { createNamedRegistry, RegistrationError } from "./named-registry";

export interface LayoutEngineRegistry {
  register(engine: AnyLayoutEngine): void;
  get(name: string): AnyLayoutEngine | undefined;
  names(): readonly string[];
  list(): readonly AnyLayoutEngine[];
}

export { RegistrationError as LayoutEngineRegistrationError };

const OPERATIONS = ["empty", "cells", "appendCell", "removeCell", "applyChange"] as const;

export function createLayoutEngines(): LayoutEngineRegistry {
  const registry = createNamedRegistry<AnyLayoutEngine>({
    label: "Layout engine",
    keyOf: (engine) => engine.name,
    pattern: KEBAB_NAME,
    invariants: [
      (engine) => (typeof engine.template?.parse !== "function" ? "has no template validator" : undefined),
      (engine) => OPERATIONS.filter((operation) => typeof engine[operation] !== "function")
        .map((operation) => `lacks the "${operation}" operation`)[0],
      (engine) => (engine.renderer === undefined || engine.renderer === null ? "has no renderer" : undefined),
    ],
  });

  return {
    register: (engine) => registry.register(engine),
    get: (name) => registry.get(name),
    names: () => registry.keys(),
    list: () => registry.list(),
  };
}

export type TemplateResolution =
  | {
      engine: AnyLayoutEngine;
      template: PageViewModel;
      /** The engine's own `validate` findings: the page renders, but not as designed. */
      warnings: string[];
      problem?: undefined;
    }
  | { engine?: undefined; template?: undefined; warnings?: undefined; problem: string };

/**
 * A raw page template -> its engine plugin, the template VALIDATED by that
 * plugin and the plugin's `validate` warnings — or a typed problem (core
 * shape, unknown engine, engine rejection). Shared by resolve, validation
 * and editors so they can never disagree: `validate` used to run at boot
 * only, so a host rendering pages never heard about a tab without a cell
 * (team-tiger review, Alexei).
 */
export function resolveTemplate(engines: LayoutEngineRegistry, raw: unknown): TemplateResolution {
  const core = pageViewModelSchema.safeParse(raw);
  if (!core.success) {
    return { problem: `invalid page template: ${issuesText(core.error)}` };
  }
  const engine = engines.get(core.data.engine);
  if (!engine) {
    return {
      problem: `unknown layout engine "${core.data.engine}" (registered: ${engines.names().join(", ") || "none"})`,
    };
  }
  let template: PageViewModel;
  try {
    template = engine.template.parse(raw) as PageViewModel;
  } catch (error) {
    return { problem: `invalid "${engine.name}" page template: ${errorText(error)}` };
  }
  return { engine, template, warnings: engineWarnings(engine, template) };
}

/** A third-party `validate` that throws is itself a warning, never a crash. */
function engineWarnings(engine: AnyLayoutEngine, template: PageViewModel): string[] {
  try {
    return engine.validate?.(template) ?? [];
  } catch (error) {
    return [`layout engine "${engine.name}" threw during validation: ${errorText(error)}`];
  }
}
