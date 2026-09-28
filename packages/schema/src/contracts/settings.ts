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

/** "json": anything that is not a primitive (an object, a list) — only on request, see `settingFields`. */
export type SettingKind = "text" | "number" | "boolean" | "select" | "json";

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
  defaultValue: unknown;
  description: string | undefined;
}

/**
 * Peel the wrappers off a setting, keeping their facts: `.default()`,
 * `.optional()`, `.nullable()`, a rule (`.refine()` — a ZodEffects), `.catch()`,
 * `.readonly()` and `.brand()` all wrap the setting's real type.
 */
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
    if (current instanceof z.ZodNullable || current instanceof z.ZodCatch || current instanceof z.ZodReadonly) {
      // Nullable keeps the key required (only the VALUE may be null); catch and readonly change nothing a field shows.
      current = current._def.innerType;
      continue;
    }
    if (current instanceof z.ZodEffects) {
      current = current._def.schema;
      continue;
    }
    if (current instanceof z.ZodBranded) {
      current = current._def.type;
      continue;
    }
    return { inner: current, optional, hasDefault, defaultValue, description };
  }
}

/** The choices of a setting that offers a fixed set: an enum, a native enum's names, or ONE literal. */
function optionsOf(schema: z.ZodTypeAny): string[] | undefined {
  if (schema instanceof z.ZodEnum) return [...(schema.options as string[])];
  if (schema instanceof z.ZodNativeEnum) {
    return Object.values(schema.enum as Record<string, unknown>).filter(
      (value): value is string => typeof value === "string",
    );
  }
  if (schema instanceof z.ZodLiteral && typeof schema.value === "string") return [schema.value];
  return undefined;
}

const kindOf = (schema: z.ZodTypeAny): SettingKind | undefined =>
  schema instanceof z.ZodString
    ? "text"
    : schema instanceof z.ZodNumber
      ? "number"
      : schema instanceof z.ZodBoolean
        ? "boolean"
        : optionsOf(schema) !== undefined
          ? "select"
          : undefined;

/** The object behind a validator — through a rule on top of it (`.refine()` makes a ZodEffects) — or undefined. */
function objectShape(validator: Validator<unknown>): Record<string, unknown> | undefined {
  const object = validator instanceof z.ZodEffects ? (validator.innerType() as unknown) : validator;
  const shape = (object as { shape?: unknown }).shape;
  return shape !== null && typeof shape === "object" ? (shape as Record<string, unknown>) : undefined;
}

/**
 * Top-level keys of an object validator (e.g. an event payload), or
 * undefined when the validator is not a zod object — builders offer them
 * as the `from` field of a reaction.
 */
export function validatorKeys(validator: Validator<unknown>): string[] | undefined {
  const shape = objectShape(validator);
  return shape === undefined ? undefined : Object.keys(shape);
}

/**
 * Top-level fields of an object validator a builder can ask for: a widget's
 * view-model settings, an action's parameters. Primitive ones only — unless
 * `json` is set: then everything else (objects, lists) comes as kind "json",
 * for a form that lets the user type JSON (an action's column overrides).
 */
export function settingFields(validator: Validator<unknown>, options: { json?: boolean } = {}): SettingField[] {
  const shape = objectShape(validator);
  if (shape === undefined) return [];
  return Object.entries(shape).flatMap(([name, schema]) => {
    if (RESERVED_VIEW_MODEL_KEYS.has(name) || !(schema instanceof z.ZodType)) return [];
    const { inner, optional, hasDefault, defaultValue, description } = unwrap(schema);
    const kind = kindOf(inner) ?? (options.json === true ? "json" : undefined);
    if (!kind) return [];
    const choices = optionsOf(inner);
    return [
      {
        name,
        kind,
        required: !optional && !hasDefault,
        ...(description === undefined ? {} : { description }),
        ...(hasDefault ? { defaultValue } : {}),
        ...(choices === undefined ? {} : { options: choices }),
      },
    ];
  });
}
