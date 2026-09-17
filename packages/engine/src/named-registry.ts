/**
 * ONE registry implementation behind all four extension points (widgets,
 * layout engines, actions, contracts). They were four hand-written copies
 * of the same twenty lines, with four error classes and five copies of the
 * name pattern (team-tiger: Alexei, Vlad, Katya).
 *
 * Every registry is strict and LOUD: a unique, well-formed key plus the
 * invariants the extension point declares. Registration happens at boot,
 * before the first render.
 */

export class RegistrationError extends Error {
  constructor(
    message: string,
    /** Which registry rejected it ("widget", "layout engine", ...). */
    readonly registry: string,
    /** The offending key (widget type, engine name, action name, kind). */
    readonly key: string,
  ) {
    super(message);
    this.name = "RegistrationError";
  }
}

/** An invariant: returns a message when the item is invalid, else undefined. */
export type Invariant<T> = (item: T, key: string) => string | undefined;

export interface NamedRegistry<T> {
  register(item: T): void;
  get(key: string): T | undefined;
  keys(): readonly string[];
  list(): readonly T[];
}

export interface NamedRegistryOptions<T> {
  /** Noun used in error messages ("Widget", "Layout engine", ...). */
  label: string;
  /** How an item names itself. */
  keyOf: (item: T) => string;
  /** Grammar the key must match. */
  pattern: RegExp;
  /** Checked in order after the key; the first message thrown. */
  invariants?: readonly Invariant<T>[];
}

export function createNamedRegistry<T>({
  label,
  keyOf,
  pattern,
  invariants = [],
}: NamedRegistryOptions<T>): NamedRegistry<T> {
  const items = new Map<string, T>();
  const fail = (message: string, key: string): never => {
    throw new RegistrationError(message, label.toLowerCase(), key);
  };

  return {
    register(item: T): void {
      const key = keyOf(item);
      if (!key || typeof key !== "string" || !pattern.test(key)) {
        fail(`${label} name ${JSON.stringify(key)} is not a valid identifier`, String(key));
      }
      if (items.has(key)) fail(`${label} "${key}" is already registered`, key);
      for (const invariant of invariants) {
        const message = invariant(item, key);
        if (message !== undefined) fail(`${label} "${key}" ${message}`, key);
      }
      items.set(key, item);
    },
    get: (key) => items.get(key),
    keys: () => [...items.keys()],
    list: () => [...items.values()],
  };
}

/** Shared invariant helper: a non-null object (arrays included) — not a plain-object check. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";
