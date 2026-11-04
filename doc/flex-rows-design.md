# Flex rows — Tailwind's layout classes as the layout vocabulary

Designed with the tiger team on 3 November 2026 (doc/team_tiger.md), built
the same day. Status: built and tested (`flex-rows.feature`, the engine's
unit tests, the demo's cards page).

## The ask

A page builder wants the POWER OF CSS FLEXBOX on the flex-rows engine —
where a widget sits in its row, how it grows and shrinks, how a row
distributes and aligns its widgets — and wants to say it in the words
they already know: Tailwind's flex classes (`flex-1`, `basis-1/3`,
`justify-between`, `items-center`, `gap-4`, `self-end`, `order-2`). And a
demo page that shows it: two cards side by side on a FlexLayout (the
docking engine), one card holding a react-grid-layout inside, the other
flex rows, both with widgets that work — three engines on one page.

## What there was

`@wirework/engine-flex-rows` laid cells out in rows of a flexbox each, a
cell's width a grammar of its own (`full`, `auto`, `m-8/12 s-1/2` with
media queries per breakpoint), nothing else to say about a row or a cell,
no interactive editing (`applyChange` was the identity) and no page of the
demo on it. The grid engines had drag and resize; flex rows had a cell
per row and that was that.

## The question, and four answers

How does a template say "this cell grows, that one keeps a third, the row
spaces them out"? Four ways were weighed.

**A. Tailwind itself, as a dependency.** Pass a cell's class string to the
element and let Tailwind style it. Rejected on three counts. The
guidelines forbid utility-class frameworks in this codebase's markup
(doc/guidelines.md, "Separating Business Logic from Presentation"), and
the engine's stylesheet is that markup. Tailwind's build compiles the
classes it can SEE in source files; a class that lives in a page template
in a store at runtime is not seen, so every name would need safelisting —
or the runtime "play" script, which is not for production. And an open
class string is an open CSS surface: `validate` could not tell `flex-1`
from `bg-red-500` or from something worse, and a page shared as JSON
would carry it.

**B. The engine's own stylesheet under Tailwind's names.** Write `.flex-1`,
`.basis-1\/3`, `.justify-between` … in `styles.css`, scoped under the
engine's root, and keep a list of the names for validation and the
builder. Honest, and it would take responsive variants (`md:flex-row`)
through media queries one day. Rejected for now because it is TWO sources
of truth — a list in TypeScript and a stylesheet — that must agree, with
no test that can read the stylesheet; because escaped class names in CSS
are a reader's nightmare; and because the inline alternative is less
code for the same result.

**C. One table: a name, the CSS it stands for.** `FLEX_CLASSES` in
`classes.ts` maps every Tailwind flex name to its React style
(`"flex-1": { flex: "1 1 0%" }`, `"basis-1/3": { flexBasis: "33.333333%" }`);
a row's or a cell's `classes` is turned into ONE inline style by
`flexStyle`, a stranger does nothing and is named by `unknownClasses`.
The table's keys are the vocabulary, the validation (`validate`) and the
builder's suggestions (a `<datalist>`), so nothing is kept in step by
hand; it is pure data, tested in node without a browser; and inline style
is exactly what the guidelines allow — "values computed from data at
runtime (e.g. a width coming from a view model)". The spacing scale and
the fractions are generated, not typed out. **Chosen.** What it gives up:
responsive variants and pseudo-states, which inline style cannot express
(see "Later").

**D. Explicit fields instead of a class string** (Ren's challenge): give a
cell `grow`, `basis`, `align` and `order` fields, a row `justify`, `align`
and `gap`, and let the form render a select each. Rejected, narrowly. The
fields are more UI for the same power, a Tailwind-literate builder would
translate in their head, and the ask was the words themselves. The string
composes (`basis-1/3 shrink-0 self-end` is one field), copies between
cells, and the datalist gives the discoverability a select would. Noted:
should a host want selects, the table is what a select reads too.

## The design

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

A row is `{ classes?, cells }` — a thing with a shape, because the row IS
the flex container and carries its own classes (`justify-*`, `items-*`,
`gap-*`, `flex-nowrap`). A cell carries its own (`flex-*`, `grow`,
`shrink`, `basis-*`, `w-*`, `h-*`, `self-*`, `order-*`, `m*-auto`). The
page is a column of rows with a gap. The old `width` and `height` are
gone: nothing in the demo used them, and one way to size a cell is enough.

Defaults, where nothing is said: a row is `display: flex; flex-wrap: wrap;
gap` (Tailwind's row default would not wrap; a page that narrows should),
a cell is `flex: 1 1 0%` — Tailwind's `flex-1` — so cells put in one row
share it equally. A cell's `classes` override both, inline style winning
over the stylesheet.

### The vocabulary (`LAYOUT_CLASSES`)

Tailwind's four layout sections, whole — first flexbox only, widened the
same day when the ask became "all of Tailwind's layout classes":

| Section        | Names                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout         | `aspect-*`, `columns-*`, `break-after/before/inside-*`, `box-border/content`, `box-decoration-*`, the display names (`block`, `flex`, `grid`, `hidden`, …), `float-*`, `clear-*`, `isolate`, `object-*` (fit and position), `overflow-*`, `overscroll-*`, `static/fixed/absolute/relative/sticky`, `inset-*`, `inset-x/y-*`, `top/right/bottom/left-*`, `start/end-*`, `visible/invisible/collapse`, `z-*` |
| Flexbox & Grid | `basis-*`, `flex-row/col/wrap…`, `flex-1/auto/initial/none/<n>`, `grow(-n)`, `shrink(-n)`, `order-*`, `grid-cols-*`, `grid-rows-*`, `col-span/start/end-*`, `row-span/start/end-*`, `grid-flow-*`, `auto-cols/rows-*`, `gap-*`, `gap-x/y-*`, `justify-*`, `justify-items-*`, `justify-self-*`, `content-*`, `items-*`, `self-*`, `place-content/items/self-*`                                              |
| Spacing        | `p-*` with `px py ps pe pt pr pb pl`, `m-*` with `mx my ms me mt mr mb ml` and `auto`                                                                                                                                                                                                                                                                                                                      |
| Sizing         | `w-*`, `min-w-*`, `max-w-*` (with `prose`), `h-*`, `min-h-*`, `max-h-*`, `size-*`                                                                                                                                                                                                                                                                                                                          |

Values are Tailwind's: the spacing scale (a step is 0.25rem: `gap-4` is
1rem, `w-64` 16rem) and `px`, the fractions (halves to sixths, twelfths:
`w-2/3` is `66.666667%`), the container scale (`w-sm` 24rem … `max-w-7xl`
80rem), `auto`, `full`, `screen` and the `svw`/`dvh` kind, `min`, `max`,
`fit`. Where Tailwind has a NEGATIVE the table has it (`-m-4`, `-top-1/2`,
`-order-1`; never of zero or of a keyword). An ARBITRARY value in brackets
works wherever Tailwind takes one (`w-[32rem]`, `grid-cols-[200px_1fr]`,
`-m-[3px]`; underscores are spaces); a keyword utility (`justify-*`,
`items-*`, `overflow-*`) takes none. Nothing outside layout — no colours,
no typography, no borders — and nothing inline style cannot say: no
responsive or state variants (`md:`, `hover:`), no `space-x-*` /
`divide-*` (child selectors; use `gap-*`). About 2 900 names; the
`<datalist>` holds them all.

### The change payload and the operations (`operations.ts`)

- `{ kind: "cell", id, classes }` and `{ kind: "row", row, classes }` set
  the classes, trimmed; cleared, the key is gone (a record keeps no empty
  values).
- `{ kind: "move", id, row, index }` puts the cell at that place, the rows
  numbered BEFORE it left its own: a row before the first (-1) or past the
  last is a new row; a row left empty is dropped; an unknown cell changes
  nothing. `moveTarget(template, id, direction)` is what an arrow asks
  for — one step left or right within the row, the end of the row above,
  the start of the row below.
- `validate(template)` names every class the table lacks, per row and per
  cell (`cell "custom-1": unknown classes bg-red-500 (Tailwind's layout
classes only)`): a warning above the page while it is edited, an error at boot.
  A typo never takes a page down — the schema takes any string, the
  stranger does nothing.
- `appendCell` starts a row per cell, as before; the size hint is ignored,
  a flex cell sizes to its content.

### Edit mode (`FlexRowsView`, `ClassesInput`)

Every row grows a BAR with "row n" and a field for its classes; every cell
a HANDLE with its id, four arrows (← → ↑ ↓, `flex-move` with
`data-direction`), a field for its classes and the adapter's chrome (Edit,
Remove, Edit content, Wrap in a card). The field is a plain text input
with the whole vocabulary as a `<datalist>` — the browser suggests as you
type, no dependency, works for a tester by `fill` — and commits ONE
change on Enter or when it loses focus, never per keystroke (the session
counts changes). While it names a class the table lacks it is
`aria-invalid` with the strangers in its title. Outside edit mode the
rows render bare: no bars, no inputs, no handles.

A layout inside a card (doc/containers-design.md) is the same engine
rendered by `NestedLayout`, never editable in place; "Edit content" shows
it as the page, bars and arrows and all. The layout element now carries
`data-engine`, so a scenario can say which engine a card runs on.

### Builder usage (for the page builder)

1. In the builder, pick **flex-rows** in the engine select while the page
   is empty (a card's content too: add the card, pick the engine, then
   fill it).
2. Add widgets. Each lands in a row of its own and takes the full width.
3. Press **Edit page**. Use a cell's **↑** to lift it into the row above
   (they share the row equally), **←** / **→** to reorder within the row,
   **↓** to push it into the row below or into a new row at the bottom.
4. Type classes into a cell's field — `basis-1/3 shrink-0` to hold a
   third, `w-2/3` or `w-[320px]` for a width, `flex-none` to take only
   what the widget needs, `self-end` to sit at the row's bottom edge,
   `ml-auto` to push it to the right, `order-last` to show it last, `p-4`
   for room inside, `-mt-2` to pull it up; into a row's field —
   `justify-between`, `items-center`, `gap-6`, `flex-nowrap`, or `grid
grid-cols-3` to make the row a grid. Press Enter; the page shows it at
   once. A name the engine does not know turns the field red and is listed
   above the page.
5. **Save page.** On a demo page with the overlay on the layout goes into
   your own view (`my-own`), as a drag on the grid does; with it off, or
   in the builder, into the shared page.

### The demo: the cards page (`/demo/cards`)

The page runs on FLEXLAYOUT: a root row of two tabsets side by side
(weights 60 and 40), each the one tab of a card, which the user may drag
and resize as the docking engine allows. The card **Counter on a grid**
holds a react-grid-layout with a statistic of `demo.counter`, the counter
that moves it and a secondary button that calls `reset-counter`; the card
**Profile in flex rows** holds flex rows — a row `items-end gap-2` with
the name input (`flex-1`) and the auto-refresh switch (`shrink-0`), both
writing the GLOBAL settings every page reads, and a row with the greeting
label (`w-full`) that echoes the name. Three widgets in each, every one
live; three layout engines on one page.

## Tested

- Unit (`engine.test.ts`, `classes.test.ts`): the layout-engine
  promises; a row per appended cell and gone with its last cell; classes
  set, trimmed, cleared; moves within and across rows, the new rows at
  either end, the empty row dropped, the row's classes kept, the unknown
  id; `validate`'s messages; Tailwind's values in the table, every name
  once, `flexStyle` merging in order with strangers ignored.
- E2E (`flex-rows.feature`): the cards page — FlexLayout at the root,
  the cards side by side (bounding boxes), each card's engine and cells,
  the profile row's classes at work (the field and the switch side by
  side, the greeting below), the counter moving the statistic, reset, the
  name typed and greeted, the switch writing the global setting; classes
  changed with the overlay on and saved into `my-own`, the shared page
  untouched; the builder — two cells lifted into one row,
  reordered, row and cell classed, saved, chrome gone; an unknown class
  flagged in the field and warned above the page, gone when corrected; a
  card's flex content edited as the page through "Edit content".

## Later

- **Responsive variants** (`md:flex-row`, `lg:basis-1/2`): inline style
  cannot; the day they are wanted, the table grows a stylesheet
  generated from it (option B on top of C) and the field accepts the
  prefixes.
- **Child selectors** (`space-x-*`, `divide-*`): inline style cannot
  reach the children; a stylesheet could, the day a row's `gap-*` is not
  enough.
- **Drag between rows**: the arrows do the job without a library; a drag
  would need one, and its own gotchas (doc/layout-engines-design.md).
- **A host's own field**: a host that wants an antd select instead of the
  native input reads `LAYOUT_CLASS_NAMES` and reports the same change.

## Reviewed 2026-11-03 (after the build), against doc/guidelines.md and doc/react-best-practices

- **Alexei:** the engine owns its template, its vocabulary and its edit
  UI — no core, schema, adapter or builder change beyond `data-engine` on
  the nested layout's element, which is the plugin contract holding as
  promised. Files are named as the engine packages name theirs
  (`FlexRowsView.tsx` with `useFlexRowsView.ts`, `ClassesInput.tsx` with
  `useClassesInput.ts`); the pure operations sit in `operations.ts`,
  tested without React. The one cast (`classed`) is a boundary with its
  comment. Accepted.
- **Dmitri:** the table reads top to bottom as the Tailwind docs do, and a
  junior finds `gap-4` in it in ten seconds; `moved` is one function with
  one comment that says what the row numbers mean. He asked for the
  `removeCell` duplicate to go — it did (`removeFlexCell` serves the
  engine and the tests). He notes the `<datalist>` is the browser's UI,
  not ours, and likes that.
- **Katya:** extending the vocabulary is one line in one table, and the
  README says so; the demo page is the onboarding. She asked that
  "classes" be the word everywhere — template, change, step sentences,
  README — and it is.
- **Sasha:** five scenarios a non-technical tester reads: "I set the flex
  classes of the cell X to Y", "I move the cell X up", "the cells X, Y sit
  side by side" (bounding boxes, settled). The unknown-class path is
  covered both ways (the field and the page warning). Her ask: a
  regression scenario should a drag library ever replace the arrows.
- **Ren:** three risks to monitor, none blocking. (1) Inline style wins
  over any stylesheet, so a host cannot theme a classed cell with CSS —
  the price of one source of truth; option B is the way out if it bites.
  (2) `order-*` reorders visually only: the DOM — and a screen reader —
  keep template order, exactly as in Tailwind; a builder who wants the
  reading order changed moves the cell. (3) The row default WRAPS where
  Tailwind's does not; documented, and `flex-nowrap` is one word away.
  He concedes the table beats a stylesheet for this scope.
- **Morgan:** the cards page shows a customer what "layout" means without
  a developer: two cards, two engines, a name typed on one page read on
  another. The builder flow is pick-add-edit-type-save. Ship.
- **Vlad:** `flexStyle` is a reduce, `FLEX_CLASSES` a spread of
  generators, `flexRowsProblems` a flatMap of flatMaps, `moveTarget` a
  lookup in a literal. He wanted `moved` as one expression; it stayed
  three lines for Dmitri.
- **External reviewer:** less than it replaces — the width grammar, its
  media queries and its test are gone; one table, one view, one input
  component, one operations file. The static datalist options are built
  once (rendering-hoist-jsx); the draft input derives its reset from the
  prop during render, no effect (rerender-derived-state-no-effect);
  callbacks are memoised on what they use; no inline components; no `!`,
  no `any`, no console. Inline `style` only from template data. Conforms.
