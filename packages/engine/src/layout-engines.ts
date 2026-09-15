/**
 * Layout-engine registry — the second extension point beside widgets.
 * Registration is strict and loud, like widgets: a plugin that registers
 * has a unique kebab-case name, a template validator, every layout
 * operation, and a renderer.
 */
import type { AnyLayoutEngine, PageViewModel } from "@wirework/schema";
import { pageViewModelSchema } from "@wirework/schema";

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export interface LayoutEngineRegistry {
  register(engine: AnyLayoutEngine): void;
  get(name: string): AnyLayoutEngine | undefined;
  names(): string[];
}

export class LayoutEngineRegistrationError extends Error {
  constructor(
    message: string,
    readonly engineName: string,
  ) {
    super(message);
    this.name = "LayoutEngineRegistrationError";
  }
}

export function createLayoutEngines(): LayoutEngineRegistry {
  const engines = new Map<string, AnyLayoutEngine>();
  return {
    register(engine): void {
      const { name } = engine;
      if (!name || !NAME_PATTERN.test(name)) {
        throw new LayoutEngineRegistrationError(
          `Layout engine name ${JSON.stringify(name)} is not a valid kebab-case identifier`,
          String(name),
        );
      }
      if (engines.has(name)) {
        throw new LayoutEngineRegistrationError(`Layout engine "${name}" is already registered`, name);
      }
      if (typeof engine.template?.parse !== "function") {
        throw new LayoutEngineRegistrationError(`Layout engine "${name}" has no template validator`, name);
      }
      for (const operation of ["empty", "cells", "appendCell", "removeCell", "applyChange"] as const) {
        if (typeof engine[operation] !== "function") {
          throw new LayoutEngineRegistrationError(
            `Layout engine "${name}" lacks the "${operation}" operation`,
            name,
          );
        }
      }
      if (engine.renderer === undefined || engine.renderer === null) {
        throw new LayoutEngineRegistrationError(`Layout engine "${name}" has no renderer`, name);
      }
      engines.set(name, engine);
    },
    get: (name) => engines.get(name),
    names: () => [...engines.keys()],
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
