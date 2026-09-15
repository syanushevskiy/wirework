/**
 * Validation rules for text inputs — PURE, widget-side.
 *  - premade rules are a closed set the builder offers as a select,
 *  - a custom rule is a regular expression from the view model.
 * Code-level custom validators would be a host registry injected like
 * actions (doc/widget-events-design.md, "Input validation") — not built.
 */
export const VALIDATION_RULES = ["none", "required", "email", "integer", "url"] as const;
export type ValidationRule = (typeof VALIDATION_RULES)[number];

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTEGER = /^-?\d+$/;

function isUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Premade rule; empty values pass every rule except `required`. */
function premade(value: string, rule: ValidationRule): string | undefined {
  if (rule === "required") return value.trim() === "" ? "required" : undefined;
  if (value === "") return undefined;
  if (rule === "email") return EMAIL.test(value) ? undefined : "must be an email address";
  if (rule === "integer") return INTEGER.test(value) ? undefined : "must be an integer";
  if (rule === "url") return isUrl(value) ? undefined : "must be a URL";
  return undefined;
}

/** Custom rule: the value must match the pattern (invalid patterns fail loudly). */
function custom(value: string, pattern: string | undefined, message: string | undefined): string | undefined {
  if (pattern === undefined || pattern === "" || value === "") return undefined;
  try {
    return new RegExp(pattern).test(value) ? undefined : (message ?? `must match ${pattern}`);
  } catch {
    return `invalid pattern: ${pattern}`;
  }
}

export function validate(
  value: string,
  rule: ValidationRule,
  pattern?: string,
  patternMessage?: string,
): ValidationResult {
  const message = premade(value, rule) ?? custom(value, pattern, patternMessage);
  return message === undefined ? { valid: true } : { valid: false, message };
}
