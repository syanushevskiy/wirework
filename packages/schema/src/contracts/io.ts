/**
 * Widget IO contract — typed INPUT ports (see doc/widget-io-design.md).
 *
 * A widget declares WHAT store values it reads as named, typed ports. The
 * view model binds port names to concrete store paths under the reserved
 * `inputs` key. `ioBindingsSchema` derives that part of the view-model
 * schema from the declaration, so the contract and the schema can never
 * drift. Widgets never WRITE the store: a write is an event the widget
 * emits plus a reaction declared in the view model
 * (doc/widget-events-design.md).
 */
import { z } from "zod";
import { hasForbiddenSegment, isConfigPath } from "./names";
import type { Validator } from "./widget";

/** One store-binding port of a widget. */
export interface PortDefinition<T = unknown> {
  /** Human description, shown by builders/playgrounds. */
  description?: string;
  /** Validator for the VALUE at the bound store path. */
  value: Validator<T>;
  /** Whether the port must be bound. Default: true. */
  required?: boolean;
  /**
   * What the widget shows while the bound path holds NOTHING (undefined):
   * declared here so builders can show it and hosts can rely on it. A
   * port without a default renders an explicit empty state instead.
   */
  default?: T;
}

export interface WidgetIO {
  /** Store values the widget READS (subscribes to). */
  inputs: Record<string, PortDefinition>;
}

/**
 * A dot-separated DATA path ("runs.data.current"): never through the
 * prototype chain, and never into a configuration tree — a binding or a
 * reaction may not address the view models that describe the page itself.
 */
export const storePathSchema = z
  .string()
  .regex(/^[^.\s]+(\.[^.\s]+)*$/, "must be a dot-separated store path")
  .refine(
    (path) => !hasForbiddenSegment(path),
    "must not contain __proto__, prototype or constructor segments",
  )
  .refine(
    (path) => !isConfigPath(path),
    "must not address a configuration tree (viewModels, userViewModels) — only editors write those",
  );
export type StorePath = z.infer<typeof storePathSchema>;

/** Port-name -> store-path bindings as they appear in a view model. */
export interface IoBindings {
  inputs: Record<string, StorePath>;
}

/** A port's binding: a store path, optional when the port says `required: false`. */
type PortBinding<P> = P extends { required: false } ? z.ZodOptional<typeof storePathSchema> : typeof storePathSchema;

/**
 * The `inputs` section's shape, one binding PER DECLARED PORT NAME — so a
 * widget reading `viewModel.inputs.shedule` fails to compile instead of
 * quietly reading nothing (the shape used to be `Record<string, ZodType>`,
 * which typed every binding as `any`; team-tiger review, Vlad).
 */
export type InputBindingsShape<P extends Record<string, PortDefinition>> = { [K in keyof P]: PortBinding<P[K]> };

function sectionSchema<P extends Record<string, PortDefinition>>(ports: P) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, port] of Object.entries(ports)) {
    shape[name] = port.required === false ? storePathSchema.optional() : storePathSchema;
  }
  // strict: binding a port the widget never declared is a config error.
  const object = z.object(shape).strict();
  // Port-less / all-optional sections may be omitted from templates entirely
  // (`.every` on no ports is already true).
  const section = Object.values(ports).every((port) => port.required === false) ? object.default({}) : object;
  // The one cast: the loop above builds exactly InputBindingsShape<P>.
  return section as unknown as z.ZodType<z.output<z.ZodObject<InputBindingsShape<P>, "strict">>>;
}

/**
 * Builds the `inputs` part of a widget's view-model schema from its IO
 * declaration. STRICT, and `.extend()` keeps it strict: a misspelled
 * setting must fail loudly, not be silently stripped.
 */
export function ioBindingsSchema<IO extends WidgetIO>(io: IO) {
  // Explicit type argument: `io.inputs` alone widens to the constraint's
  // Record<string, PortDefinition>, which would lose the port names again.
  return z.object({ inputs: sectionSchema<IO["inputs"]>(io.inputs) }).strict();
}

/** IO declaration for widgets with no store bindings. */
export const NO_IO = { inputs: {} } satisfies WidgetIO;
