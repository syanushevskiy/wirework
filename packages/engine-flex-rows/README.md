# @wirework/engine-flex-rows

Rows of cells, each row a CSS flexbox, laid out by Tailwind's LAYOUT CLASS
NAMES (doc/flex-rows-design.md). A good first engine to read, and the one
the engine's own tests use. Peer: `react`. No Tailwind: the names are
borrowed because page builders know them; the CSS is the engine's own.

```ts
import { flexRowsEngine } from "@wirework/engine-flex-rows";
import "@wirework/engine-flex-rows/styles.css";
layoutEngines.register(flexRowsEngine); // page templates use engine: "flex-rows"
```

A template is `{ engine: "flex-rows", rows: [{ classes?, cells: [{ id,
widget, model, template, classes? }] }] }`. A row's `classes` say how it
lays its cells out (`justify-between items-center gap-4 flex-nowrap`, or
`grid grid-cols-3`), a cell's how it grows, shrinks, sizes, aligns, orders
and spaces itself (`flex-1`, `basis-1/3 shrink-0`, `w-2/3`, `w-[320px]`,
`self-end`, `order-last`, `ml-auto`, `p-4`, `-mt-2`). Without classes a
row wraps with a gap and every cell takes an equal share (`flex-1`).

The vocabulary is `LAYOUT_CLASSES` (name → CSS): Tailwind's Layout,
Flexbox & Grid, Spacing and Sizing sections whole — display, position and
inset, float, overflow, z-index, aspect and columns; flex, grow, shrink,
basis, order, grid templates, spans, flow and auto tracks, gap, the
justify / align / place families; padding and margins; width, height,
their limits and `size-*` — with Tailwind's spacing scale, fractions and
container scale, the negatives Tailwind has (`-m-4`, `-top-1/2`) and an
arbitrary value in brackets wherever Tailwind takes one (`w-[32rem]`,
`grid-cols-[200px_1fr]`). `LAYOUT_CLASS_NAMES` lists the names,
`styleOf(name)` is one name's style (arbitrary values included),
`layoutStyle(classes)` the style a value stands for, `unknownClasses`
what the engine lacks — responsive and state variants and the child
selectors of `space-*`, which inline style cannot say. A name nobody knows
is reported by `validate` (a warning above the page, an error at boot)
and does nothing.

In edit mode every row has a bar with a field for its classes, and every
cell a handle with its id and a field for its own classes; Enter or
leaving the field commits ONE change. A cell is MOVED by dragging its
handle (`flex-handle`): let go on another cell's middle the two swap
places, on its left or right quarter the dragged one goes before or after
it, on the strip between two rows (`flex-row-drop`) it takes a row of its
own; the target is marked while the drag lasts (`data-drop`), nothing
moves before the drop. The change payload (`FlexRowsChange`) is
`{ kind: "cell", id, classes }`, `{ kind: "row", row, classes }`,
`{ kind: "move", id, row, index, own? }` (`own`: a new row before `row`)
or `{ kind: "swap", id, with }`; `applyFlexRowsChange`, `dropChange` (the
change a drop asks for) and `removeFlexCell` are the pure operations
behind it.
