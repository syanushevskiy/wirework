/**
 * The height of a list that FILLS the window (`heightMode: "fill"`,
 * doc/ADR/0021-table-height.md): MEASURED — where the box starts, how tall
 * the window is — and measured again, once a frame at most, whenever that
 * may have changed: the window was resized, the widget itself changed size
 * (its bar wrapped onto a second line), or the page did (something above
 * the table appeared or grew). The arithmetic is `fillHeight`.
 *
 * Nothing until it is measured (the first render; a test without a layout):
 * the box is then as tall as the setting says.
 */
import { useEffect, useState, type RefObject } from "react";
import { fillHeight, scrolledAbove } from "../fill-height";

export function useFillHeight(
  boxRef: RefObject<HTMLElement | null>,
  /** Whether the list fills at all: off, nothing is measured or listened to. */
  enabled: boolean,
  /** The least the box may be, and the gap left under it — both in pixels. */
  least: number,
  gap: number,
): number | undefined {
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const box = boxRef.current;
    if (!enabled || box === null || typeof requestAnimationFrame === "undefined") return undefined;
    let frame: number | undefined;
    const measure = () => {
      frame = undefined;
      const top = box.getBoundingClientRect().top + scrolledAbove(box);
      setHeight(fillHeight(window.innerHeight, top, gap, least));
    };
    const look = () => {
      frame ??= requestAnimationFrame(measure);
    };
    look();
    window.addEventListener("resize", look);
    // The box's own size is the result, never a reason to measure: the widget around it and the page are watched.
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(look);
    if (box.parentElement !== null) observer?.observe(box.parentElement);
    observer?.observe(document.body);
    return () => {
      window.removeEventListener("resize", look);
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [boxRef, enabled, least, gap]);

  return enabled ? height : undefined;
}
