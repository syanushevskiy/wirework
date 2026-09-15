/**
 * Width micro-grammar -> flex style. "full" and "auto" are keywords; a
 * responsive spec like "m-8/12 s-1/2" is a list of `<breakpoint>-<fraction>`
 * tokens. The renderer applies the medium ("m") fraction as flex-basis and
 * exposes the raw spec via data attribute for CSS/media-query refinement.
 */
import type { CSSProperties } from "react";

export function widthStyle(width: string | undefined): CSSProperties {
  if (width === undefined || width === "auto") {
    return { flex: "0 1 auto" };
  }
  if (width === "full") {
    return { flex: "1 1 100%" };
  }
  for (const token of width.split(/\s+/)) {
    const match = /^m-(\d+)(?:\/(\d+))?$/.exec(token);
    if (match) {
      const numerator = Number(match[1]);
      const denominator = match[2] !== undefined ? Number(match[2]) : 1;
      if (denominator > 0) {
        const percent = (numerator / denominator) * 100;
        return { flex: `1 1 ${percent.toFixed(4)}%` };
      }
    }
  }
  return { flex: "1 1 auto" };
}
