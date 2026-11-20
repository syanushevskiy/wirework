# ADR-0010: Flex rows — Tailwind's layout classes as the layout vocabulary

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

The flex-rows engine lays cells out in ROWS of a flexbox each. A row's
and a cell's `classes` are Tailwind's layout class names. ONE table
(`LAYOUT_CLASSES`) maps every name to its CSS and turns the classes into
inline style; its keys are the vocabulary, the validation and the
builder's suggestions. Tailwind itself is not a dependency, so there are
no responsive or state variants. Built and tested (`flex-rows.feature`).

## 2. Problem

A page builder wants the power of CSS flexbox on the flex-rows engine —
where a widget sits in its row, how it grows and shrinks, how a row
distributes and aligns its widgets — in words they already know:
Tailwind's classes (`flex-1`, `basis-1/3`, `justify-between`,
`items-center`, `gap-4`, `self-end`, `order-2`). The ask then widened to
all of Tailwind's layout classes.

Before this, `@wirework/engine-flex-rows` had a width grammar of its own
with media queries, nothing to say about a row, and no interactive
editing. That grammar and the old `width` / `height` are gone: one way to
size a cell is enough.

## 3. Details

### The template

```json
{
  "engine": "flex-rows",
  "rows": [
    { "cells": [{ "id": "title", "...": "...", "classes": "w-full" }] },
    {
      "classes": "items-stretch gap-4",
      "cells": [
        { "id": "card-counter", "...": "...", "classes": "flex-1" },
        { "id": "card-profile", "...": "...", "classes": "basis-1/3 shrink-0" }
      ]
    }
  ]
}
```

A row is `{ classes?, cells }`: it IS the flex container and carries its
own classes (`justify-*`, `items-*`, `gap-*`, `flex-nowrap`). A cell
carries its own (`flex-*`, `grow`, `shrink`, `basis-*`, `w-*`, `h-*`,
`self-*`, `order-*`, `m*-auto`). The page is a column of rows with a gap.

Defaults, where nothing is said: a row is `display: flex; flex-wrap:
wrap` with a gap; a cell is `flex: 1 1 0%` (Tailwind's `flex-1`), so
cells in one row share it equally. A cell's `classes` override both.

### The vocabulary (`LAYOUT_CLASSES`)

`LAYOUT_CLASSES` in `packages/engine-flex-rows/src/classes.ts` holds
Tailwind's four layout sections, whole. `layoutStyle` turns a `classes`
string into one inline style; `unknownClasses` names the strangers;
`LAYOUT_CLASS_NAMES` is the list a host's own field may read. The spacing
scale and the fractions are generated, not typed out. Extending the
vocabulary is one line in the table.

| Section        | Names                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout         | `aspect-*`, `columns-*`, `break-after/before/inside-*`, `box-border/content`, `box-decoration-*`, the display names (`block`, `flex`, `grid`, `hidden`, …), `float-*`, `clear-*`, `isolate`, `object-*` (fit and position), `overflow-*`, `overscroll-*`, `static/fixed/absolute/relative/sticky`, `inset-*`, `inset-x/y-*`, `top/right/bottom/left-*`, `start/end-*`, `visible/invisible/collapse`, `z-*` |
| Flexbox & Grid | `basis-*`, `flex-row/col/wrap…`, `flex-1/auto/initial/none/<n>`, `grow(-n)`, `shrink(-n)`, `order-*`, `grid-cols-*`, `grid-rows-*`, `col-span/start/end-*`, `row-span/start/end-*`, `grid-flow-*`, `auto-cols/rows-*`, `gap-*`, `gap-x/y-*`, `justify-*`, `justify-items-*`, `justify-self-*`, `content-*`, `items-*`, `self-*`, `place-content/items/self-*`                                              |
| Spacing        | `p-*` with `px py ps pe pt pr pb pl`, `m-*` with `mx my ms me mt mr mb ml` and `auto`                                                                                                                                                                                                                                                                                                                      |
| Sizing         | `w-*`, `min-w-*`, `max-w-*` (with `prose`), `h-*`, `min-h-*`, `max-h-*`, `size-*`                                                                                                                                                                                                                                                                                                                          |

- **Values** are Tailwind's: the spacing scale (a step is 0.25rem:
  `gap-4` is 1rem, `w-64` 16rem) and `px`; the fractions (halves to
  sixths, twelfths: `w-2/3` is `66.666667%`); the container scale (`w-sm`
  24rem … `max-w-7xl` 80rem); `auto`, `full`, `screen` and the `svw` /
  `dvh` kind; `min`, `max`, `fit`.
- **Negatives** where Tailwind has one (`-m-4`, `-top-1/2`, `-order-1`),
  never of zero or of a keyword.
- **Arbitrary values** in brackets wherever Tailwind takes one
  (`w-[32rem]`, `grid-cols-[200px_1fr]`, `-m-[3px]`; underscores are
  spaces). A keyword utility (`justify-*`, `items-*`, `overflow-*`) takes
  none.
- **Not in it:** anything outside layout (colours, typography, borders);
  responsive and state variants (`md:`, `hover:`); `space-x-*` and
  `divide-*`, which are child selectors — use `gap-*`.
- 3 226 names, all in the field's `<datalist>`, every one accepted by
  Tailwind 4.3.4's compiler. `-order-last`, `max-w-auto` and `max-h-auto`
  are not Tailwind's and are kept out by a test.

Two differences from Tailwind, because the mechanism is inline style:

- **Order.** Of two names that set the same property, the LATER one in
  the field wins (`px-2 p-4` pads all four sides 1rem). Write the general
  name first and the specific one after it (`p-4 px-2`, `flex-none
basis-24`) and both agree.
- **Precedence.** Inline style beats every class rule, a host's included.

### Changes and validation (`operations.ts`)

- `{ kind: "cell", id, classes }` and `{ kind: "row", row, classes }` set
  the classes, trimmed; cleared, the key is gone.
- `{ kind: "move", id, row, index }` puts the cell at that place, the
  rows numbered BEFORE it left its own. A row before the first (-1) or
  past the last is a new row; with `own: true` the cell takes a new row
  of its own before `row`. A row left empty is dropped; an unknown cell
  changes nothing.
- `{ kind: "swap", id, with }` swaps two cells. Each keeps its own
  classes — they are the cell's, not the place's.
- `validate(template)` names every class the table lacks, per row and
  per cell (`cell "custom-1": unknown classes bg-red-500 (Tailwind's
layout classes only)`): a warning above the page while it is edited, an
  error at boot. The schema takes any string and a stranger does nothing,
  so a typo never takes a page down.
- `appendCell` starts a row per cell. The size hint is ignored: a flex
  cell sizes to its content.

### Edit mode (`FlexRowsView`, `ClassesInput`)

Every row grows a BAR (`flex-row-bar`) with "row n" and a field for its
classes. Every cell grows a HANDLE (`flex-handle`) with its id, a field
for its classes and the adapter's chrome (Edit, Remove, Edit content,
Wrap in a card). Outside edit mode the rows render bare.

The field is a plain text input with the whole vocabulary as a
`<datalist>`. It commits ONE change on Enter or when it loses focus,
never per keystroke. While it names a class the table lacks it is
`aria-invalid` with the strangers in its title.

A layout inside a card (ADR-0009) is the same engine rendered by
`NestedLayout`, never editable in place; "Edit content" shows it as the
page, bars and handles and all. With the user overlay on, a change goes
into the user's own view (`my-own`); with it off, or in the builder, into
the shared page.

### Moved by drag and drop

A cell is moved by drag, never by arrows. No library: the drag is pointer
events and rectangles, as css-grid's is.

- **The handle drags.** The whole handle bar is the grip (its label
  `flex-handle-label`); the classes field and the chrome buttons keep
  their press. While the drag lasts the cell stays where it is, faded
  (`data-dragging`), and the target is marked (`data-drop`). Nothing
  moves until the drop.
- **Where it is let go decides** (`dropChange`, pure):
  - on another cell's MIDDLE the two swap places (`data-drop="swap"`);
  - on its left or right QUARTER the dragged cell goes before or after
    it, into its row (`data-drop="before" | "after"`);
  - in a row's free room, beside the nearest cell;
  - on the STRIP between rows — one above every row and one under the
    last (`flex-row-drop`, `data-row`) — it takes a new row of its own.
- A drop that would change nothing is no change at all.
- **A card on flex rows inside a cell** has cells and rows of its own.
  The drag measures only the view's own, so a drop on a card is a drop
  on the card's cell.
- **Sizes stay classes.** Nothing is resized by drag: a dragged divider
  would have to rewrite words the author typed.

### The demo

The FlexLayout page (`/demo/flexlayout`) runs FlexLayout at the root,
with a react-grid-layout inside `card-counter`, flex rows inside
`card-profile` and a CSS grid inside `card-session`. The profile card's
row of three buttons of different sizes (`basis-32 grow`, `flex-none
basis-24`, `flex-none basis-20`) wraps as the card narrows.

### Risks, accepted

- Inline style wins over any stylesheet, so a host cannot theme a classed
  cell with CSS. Option B is the way out if it bites.
- `order-*` reorders visually only: the DOM and a screen reader keep
  template order, as in Tailwind. To change the reading order, move the
  cell.
- A row WRAPS by default where Tailwind's does not; `flex-nowrap` is one
  word away.

### Not built

- **Responsive variants** (`md:flex-row`): inline style cannot. The route
  is under "Tailwind itself, weighed again" — or a generated stylesheet
  of the table's own (B on top of C).
- **Child selectors** (`space-x-*`, `divide-*`): a stylesheet could reach
  the children, the day a row's `gap-*` is not enough.
- **A host's own field**: a host that wants an antd select instead of the
  native input reads `LAYOUT_CLASS_NAMES` and reports the same change.

## 4. Options weighed

How does a template say "this cell grows, that one keeps a third, the row
spaces them out"?

| Option                                         | Verdict                                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Tailwind itself, as a dependency            | Rejected. The guidelines forbid utility-class frameworks in this codebase's markup. Tailwind compiles the classes it SEES in source; a class in a page template in a store is not seen. An open class string is an open CSS surface that `validate` could not tell apart. |
| B. The engine's own stylesheet under the names | Rejected for now. Two sources of truth — a list in TypeScript and a stylesheet — with no test that reads the stylesheet, and escaped class names in CSS. It would take responsive variants through media queries one day.                                                 |
| C. One table: a name, the CSS it stands for    | Chosen. One source of truth: the keys are the vocabulary, the validation and the suggestions. Pure data, tested in node without a browser. Inline style from template data is what the guidelines allow. Gives up responsive variants and pseudo-states.                  |
| D. Explicit fields (`grow`, `basis`, `align`…) | Rejected, narrowly. More UI for the same power, and the ask was the words themselves. The string composes, copies between cells, and the datalist gives the discoverability a select would. A host that wants selects reads the same table.                               |

### Tailwind itself, weighed again

Why not install Tailwind, its general-purpose classes only? Tried with
Tailwind 4.3.4 in the engine package, its compiler asked for the
stylesheet of the table's names (`@tailwindcss/node`'s `compile`). The
findings, kept because the question will come back:

- **Tailwind is a compiler.** It emits CSS for the names it sees in
  source files. Page templates live in a store, the builder and a server,
  so the names must be handed to it as a safelist — which is the table.
  Validation still needs the table: Tailwind has no list of valid names
  to ask at runtime.
- **A prefix is a must in both kinds of host.** Without Tailwind in the
  host, an unprefixed engine stylesheet defines `.hidden`, `.block`,
  `.flex`, `.grid`, `.collapse` globally. With Tailwind in the host, the
  two stylesheets define the same names and both write `--spacing`;
  whichever loads later wins. With `prefix(ww)` the rules are `.ww\:w-4`
  and the variable `--ww-spacing`. Template data would keep `w-2/3`; the
  renderer would write `ww:w-2/3`.
- **Cascade layers.** Tailwind puts utilities in `@layer utilities`, and
  unlayered CSS beats any layered rule. The engine would import the
  utilities UNLAYERED and lower its own defaults to `:where()`, or
  `flex-none` would lose to the default `flex: 1 1 0%`.
- **Arbitrary values** (`w-[320px]`) cannot be in a prebuilt stylesheet;
  they would stay inline style. `md:w-[320px]` is impossible without a
  runtime compiler.
- **Size**, minified then gzipped:

  | Stylesheet                                             | Minified | Gzipped |
  | ------------------------------------------------------ | -------- | ------- |
  | The table as it is (`classes.ts` built; no stylesheet) | 14.5 KB  | 4.3 KB  |
  | Tailwind, the table's names, no breakpoints            | 149 KB   | 19 KB   |
  | Tailwind, the names × `sm md lg xl 2xl`                | 957 KB   | 115 KB  |

  The table is small because it ships a recipe — forty utility
  definitions and a few value lists multiplied on load (about 650 KB of
  heap, 7 ms) — where a stylesheet must spell every rule out.

**Decided: without Tailwind.** The prefix would solve coexistence; what
Tailwind buys is `md:` variants at 115 KB, or nothing new at 19 KB,
against 4.3 KB — and the guidelines' rule stands. Should responsive
variants become a requirement, the route is: Tailwind as a dev dependency
of the engine package only, the table as the safelist, the prefix `ww`,
the utilities unlayered, breakpoints for the Flexbox and Sizing sections
only (near 40 KB), the generated stylesheet committed and checked by a
test — about a day's work.
