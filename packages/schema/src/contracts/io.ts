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

/** Segments the store refuses (they would address the prototype chain). */
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

/** A dot-separated store path ("runs.data.current"), never through the prototype chain. */
export const storePathSchema = z
  .string()
  .regex(/^[^.\s]+(\.[^.\s]+)*$/, "must be a dot-separated store path")
  .refine(
    (path) => !path.split(".").some((segment) => FORBIDDEN_SEGMENTS.has(segment)),
    "must not contain __proto__, prototype or constructor segments",
  );
export type StorePath = z.infer<typeof storePathSchema>;

/** Port-name -> store-path bindings as they appear in a view model. */
export interface IoBindings {
  inputs: Record<string, StorePath>;
}

function sectionSchema(ports: Record<string, PortDefinition>) {
  const shape: Record<string, z.ZodType> = {};
  for (const [name, port] of Object.entries(ports)) {
    shape[name] = port.required === false ? storePathSchema.optional() : storePathSchema;
  }
  // strict: binding a port the widget never declared is a config error.
  const object = z.object(shape).strict();
  // Port-less / all-optional sections may be omitted from templates entirely.
  const allOptional = Object.values(ports).every((port) => port.required === false);
  return Object.keys(ports).length === 0 || allOptional
    ? object.default({})
    : object;
}

/**
 * Builds the `inputs` part of a widget's view-model schema from its IO
 * declaration. Compose widget settings on top with `.extend()`.
 */
export function ioBindingsSchema(io: WidgetIO) {
  return z.object({ inputs: sectionSchema(io.inputs) });
}

/** IO declaration for widgets with no store bindings. */
export const NO_IO: WidgetIO = { inputs: {} };
