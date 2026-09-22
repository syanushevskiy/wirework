/**
 * How a table CELL is shown — the predefined kinds a column may select
 * (doc/table-view-design.md, "Customizing a table"). A kind's configuration
 * holds LITERALS and ROW-PROPERTY SELECTIONS only: no conditionals, no
 * comparisons, no patterns, no format logic — that is the admission rule.
 * Anything needing two properties or a condition is a named renderer the
 * host registers in code (`kind: "custom"`), which a page selects by name.
 *
 * - `text`   the value as text (what every column shows without a `cell`).
 * - `tag`    a tag in a tone: the value, matched exactly against `tones`,
 *            picks the tone; a miss shows `default`; nothing for no value.
 * - `link`   the text as a link to an address of the application: `to` is
 *            a pattern whose `{property}` slots SELECT row properties, each
 *            URL-encoded — the same thing a route pattern is, no expression.
 * - `custom` a renderer the host registered under `name`; `params` are
 *            handed to it as they are. An unknown name shows the text.
 *
 * The helpers are pure and shared by every implementation.
 */
import { z } from "zod";
import { getPath, KEBAB_NAME } from "@wirework/schema";
import { TAG_TONES, type TagTone } from "./tag";

/** An address of the application: one leading "/", never "//" or "/\" (no other origin). */
export const appPathSchema = z.string().regex(/^\/(?![/\\])/, 'An address of the application, starting with one "/"');

export const tableCellSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text") }).strict(),
  z
    .object({
      kind: z.literal("tag"),
      /** Value (as text) to tone, matched exactly: { "Success": "success", "Failed": "danger" }. */
      tones: z.record(z.string(), z.enum(TAG_TONES)).default({}),
    })
    .strict(),
  z
    .object({
      kind: z.literal("link"),
      /** Address pattern; {property} slots select row properties: "/demo/runs/{id}". */
      to: appPathSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("custom"),
      /** The renderer's name as the host registered it. */
      name: z.string().regex(KEBAB_NAME, "A renderer name is kebab-case"),
      params: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
]);
export type TableCell = z.infer<typeof tableCellSchema>;
export type TableCellKind = TableCell["kind"];

/** A cell value as text: nothing for null/undefined, JSON for objects, the value otherwise. */
export function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** The tone a tag cell shows for a value: an exact match of its text, `default` otherwise. */
export function cellTone(tones: Partial<Record<string, TagTone>>, value: unknown): TagTone {
  return tones[cellText(value)] ?? "default";
}

const SLOT = /\{([^{}]+)\}/g;

/**
 * The address a link cell points to: the pattern with every slot replaced by
 * the row's property, URL-encoded — or undefined when a slot has no value,
 * so the cell shows plain text instead of a broken link.
 */
export function cellHref(to: string, row: unknown): string | undefined {
  let missing = false;
  const href = to.replace(SLOT, (_, property: string) => {
    const value = getPath(row, property.trim());
    if (value === undefined || value === null || value === "") missing = true;
    return encodeURIComponent(cellText(value));
  });
  return missing ? undefined : href;
}
