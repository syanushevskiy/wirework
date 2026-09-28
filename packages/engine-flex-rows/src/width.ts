/**
 * Width micro-grammar -> flex style. "full" and "auto" are keywords; a
 * responsive spec like "m-8/12 s-1/2" is a list of `<breakpoint>-<fraction>`
 * tokens, one per breakpoint: `m` is the basis, `s` applies on narrow
 * screens and `l` on wide ones. The fractions become custom properties on
 * the item; the media queries in styles.css pick the one that applies.
 */
import type { CSSProperties } from "react";

/** The breakpoints a width spec may name: narrow (s), the default (m), wide (l). Their widths are styles.css's. */
export const BREAKPOINTS = ["s", "m", "l"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

/** The custom property the item carries for a breakpoint's basis. */
export const basisProperty = (breakpoint: Breakpoint): string => `--ww-basis-${breakpoint}`;

const TOKEN = /^([sml])-(\d+)(?:\/(\d+))?$/;

export function widthStyle(width: string | undefined): CSSProperties {
  if (width === undefined || width === "auto") {
    return { flex: "0 1 auto" };
  }
  if (width === "full") {
    return { flex: "1 1 100%" };
  }
  const style: Record<string, string> = {};
  for (const token of width.split(/\s+/)) {
    const match = TOKEN.exec(token);
    if (!match) continue;
    const [, breakpoint = "m", numerator = "1", denominator = "1"] = match;
    if (Number(denominator) === 0) continue;
    const percent = (Number(numerator) / Number(denominator)) * 100;
    style[basisProperty(breakpoint as Breakpoint)] = `${percent.toFixed(4)}%`;
  }
  // Custom properties are not in React's CSSProperties, and are what the media queries read.
  return style as CSSProperties;
}
