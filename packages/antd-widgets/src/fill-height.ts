/**
 * How tall a list is that FILLS the room down to the bottom of the window
 * (`heightMode: "fill"`, doc/ADR/0021-table-height.md): from where its box
 * starts to the window's bottom, less the gap the page leaves under it —
 * never more than that, and never less than the least it may be (on a
 * window too short for it the page scrolls instead). Pure arithmetic;
 * measuring is the hook's job (use-fill-height.ts).
 */
export function fillHeight(windowHeight: number, top: number, gap: number, least: number): number {
  return Math.max(least, Math.floor(windowHeight - top - gap));
}

/** What `fillHeight` needs of a scrolling ancestor: how far it is scrolled, and what is above it. */
interface Scrolled {
  scrollTop: number;
  parentElement: Scrolled | null;
}

/**
 * How far the ancestors of an element are scrolled, in all — the window
 * included (the document's element is the last ancestor). Added to the
 * element's top in the viewport it gives where the element starts in the
 * page AT REST, so a page scrolled when the height is measured gets the
 * height it would get at its top.
 */
export function scrolledAbove(element: Scrolled): number {
  let sum = 0;
  for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) sum += parent.scrollTop;
  return sum;
}
