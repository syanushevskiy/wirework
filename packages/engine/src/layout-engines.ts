/**
 * Layout-engine registry — the second extension point beside widgets.
 * Registration is strict and loud, like widgets: a plugin that registers
 * has a unique kebab-case name, a template validator, every layout
 * operation, and a renderer.
 */
import { KEBAB_NAME, pageViewModelSchema, type AnyLayoutEngine, type PageViewModel } from "@wirework/schema";
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
  | { engine: AnyLayoutEngine; template: PageViewModel; problem?: undefined }
  | { engine?: undefined; template?: undefined; problem: string };

/**
 * A raw page template -> its engine plugin and the template VALIDATED by
 * that plugin, or a typed problem (core shape, unknown engine, engine
 * rejection). Shared by resolve, validation and editors so they can never
 * disagree.
 */
export function resolveTemplate(engines: LayoutEngineRegistry, raw: unknown): TemplateResolution {
  const core = pageViewModelSchema.safeParse(raw);
  if (!core.success) {
    return {
      problem: `invalid page template: ${core.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    };
  }
  const engine = engines.get(core.data.engine);
  if (!engine) {
    return {
      problem: `unknown layout engine "${core.data.engine}" (registered: ${engines.names().join(", ") || "none"})`,
    };
  }
  try {
    return { engine, template: engine.template.parse(raw) as PageViewModel };
  } catch (error) {
    return {
      problem: `invalid "${engine.name}" page template: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
