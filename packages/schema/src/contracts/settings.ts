/**
 * Widget settings introspection — what a builder can ASK for beyond IO
 * ports and events (doc/widget-io-design.md, "Builder settings").
 *
 * A widget's view model is its settings; the reserved `inputs`/
 * `on` sections are bindings. This helper reads the PRIMITIVE top-level
 * settings (string, number, boolean, enum — optionally wrapped in
 * `.optional()` / `.default()` / `.describe()`) off a zod object validator
 * so a builder can render one field each (an enum becomes a select). Non-primitive settings (arrays, objects) are left
 * to their defaults — the state inspector edits those.
 *
 * Zod is the one validator this package is built on; a non-zod Validator
 * simply yields no fields.
 */
import { z } from "zod";
import type { Validator } from "./widget";

/** View-model keys that are bindings, never settings. */
export const RESERVED_VIEW_MODEL_KEYS = new Set(["inputs", "on"]);

export type SettingKind = "text" | "number" | "boolean" | "select";

export interface SettingField {
  name: string;
  kind: SettingKind;
  /** `select` only: the allowed values (a zod enum). */
  options?: string[];
  /** True when the setting has neither a default nor `.optional()`. */
  required: boolean;
  /** From `.describe()` on the setting or any wrapper. */
  description?: string;
  /** From `.default()`, when present. */
  defaultValue?: unknown;
}

interface Unwrapped {
  inner: z.ZodTypeAny;
  optional: boolean;
  hasDefault: boolean;
  defaultValue?: unknown;
  description?: string;
}

/** Peel `.default()` / `.optional()` / `.nullable()` wrappers, keeping their facts. */
function unwrap(schema: z.ZodTypeAny): Unwrapped {
  let current = schema;
  let optional = false;
  let hasDefault = false;
  let defaultValue: unknown;
  let description: string | undefined;
  for (;;) {
    description ??= current.description;
    if (current instanceof z.ZodDefault) {
      if (!hasDefault) {
        hasDefault = true;
        defaultValue = current._def.defaultValue();
      }
      current = current._def.innerType;
      continue;
    }
    if (current instanceof z.ZodOptional) {
      optional = true;
      current = current._def.innerType;
      continue;
    }
    if (current instanceof z.ZodNullable) {
      // Nullable keeps the key required; only the VALUE may be null.
      current = current._def.innerType;
      continue;
    }
    return { inner: current, optional, hasDefault, defaultValue, description };
  }
}

const kindOf = (schema: z.ZodTypeAny): SettingKind | undefined =>
  schema instanceof z.ZodString
    ? "text"
    : schema instanceof z.ZodNumber
      ? "number"
      : schema instanceof z.ZodBoolean
        ? "boolean"
        : schema instanceof z.ZodEnum
          ? "select"
          : undefined;

/**
 * Top-level keys of an object validator (e.g. an event payload), or
 * undefined when the validator is not a zod object — builders offer them
 * as the `from` field of a reaction.
 */
export function validatorKeys(validator: Validator<unknown>): string[] | undefined {
  const shape = (validator as { shape?: unknown }).shape;
  if (shape === null || typeof shape !== "object") return undefined;
  return Object.keys(shape as Record<string, unknown>);
}

/** Primitive top-level settings of a widget's view-model validator. */
export function settingFields(validator: Validator<unknown>): SettingField[] {
  const shape = (validator as { shape?: unknown }).shape;
  if (shape === null || typeof shape !== "object") return [];
  return Object.entries(shape as Record<string, unknown>).flatMap(([name, schema]) => {
    if (RESERVED_VIEW_MODEL_KEYS.has(name) || !(schema instanceof z.ZodType)) return [];
    const { inner, optional, hasDefault, defaultValue, description } = unwrap(schema);
    const kind = kindOf(inner);
    if (!kind) return [];
    return [
      {
        name,
        kind,
        required: !optional && !hasDefault,
        description,
        ...(hasDefault ? { defaultValue } : {}),
        ...(inner instanceof z.ZodEnum ? { options: [...(inner.options as string[])] } : {}),
      },
    ];
  });
}
