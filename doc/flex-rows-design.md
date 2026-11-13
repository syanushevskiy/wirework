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
`divide-*` (child selectors; use `gap-*`). 3 226 names; the `<datalist>`
holds them all. Every name was checked against Tailwind 4.3.4's own
compiler on 3 November 2026 (see "Tailwind itself, weighed again"): three
the table had, Tailwind lacks — `-order-last`, `max-w-auto`, `max-h-auto`
— and they are gone, pinned by a test.

Two things a Tailwind user should know, because the names are Tailwind's
but the mechanism is inline style. The ORDER of two names that set the
same property: here the later one in the field wins (`px-2 p-4` pads all
four sides 1rem), where Tailwind's stylesheet order would let `px-2` win
either way — write the general name first and the specific one after it
and both agree (`p-4 px-2`, `flex-none basis-24`). And PRECEDENCE: inline
style beats every class rule, a host's included, where a Tailwind class
is an ordinary rule.

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
(weights 40 and 60 — the playground's page is 728px wide at most, and the
profile card needs the room), each the one tab of a card, which the user
may drag and resize as the docking engine allows. The card **Counter on a
grid** holds a react-grid-layout with a statistic of `demo.counter`, the
counter that moves it and a secondary button that calls `reset-counter`;
the card **Profile in flex rows** holds three flex rows: a row `gap-2` of
three buttons of DIFFERENT sizes — Alice `basis-32 grow` (8rem, and it
grows into the room left), Bob `flex-none basis-24` (6rem, fixed), Clear
`flex-none basis-20` (5rem, fixed) — each a `set` of
`app.settings.displayName` with a literal value; a row `items-end gap-2`
with the name input (`flex-1`) and the auto-refresh switch (`shrink-0`),
both writing the GLOBAL settings every page reads; and a row with the
greeting label (`w-full`) that echoes the name. A row WRAPS by default,
so when the card gets narrow — the window resized, or the splitter
dragged — the button that no longer fits goes to the next line of its row
and comes back with the room: at the e2e's 1280px the three stand side by
side, at 600px Clear drops under Alice, at 520px Bob does too. Three
layout engines on one page, every widget live.

## Tested

- Unit (`engine.test.ts`, `classes.test.ts`): the layout-engine
  promises; a row per appended cell and gone with its last cell; classes
  set, trimmed, cleared; moves within and across rows, the new rows at
  either end, the empty row dropped, the row's classes kept, the unknown
  id; `validate`'s messages; Tailwind's values in the table, every name
  once, `flexStyle` merging in order with strangers ignored.
- E2E (`flex-rows.feature`): the cards page — FlexLayout at the root,
  the cards side by side (bounding boxes), each card's engine and cells,
  the profile rows' classes at work (the field and the switch side by
  side, the greeting below), the counter moving the statistic, reset, the
  name typed and greeted, the switch writing the global setting; the
  profile card's row of buttons — three sizes measured (Alice wider than
  Bob, Bob wider than Clear), the buttons setting the name the field and
  the greeting follow, the row wrapping as the window narrows to 600px
  and 520px and unwrapping at 1280px; classes
  changed with the overlay on and saved into `my-own`, the shared page
  untouched; the builder — two cells lifted into one row,
  reordered, row and cell classed, saved, chrome gone; an unknown class
  flagged in the field and warned above the page, gone when corrected; a
  card's flex content edited as the page through "Edit content".

## Tailwind itself, weighed again (3 November 2026)

After the build the question came back: why not install Tailwind, its
general-purpose classes only? Investigated with Tailwind 4.3.4 installed
in the engine package for an afternoon and its compiler asked for the
stylesheet of the table's names (`@tailwindcss/node`'s `compile`, the
names as the candidates). What was learnt, kept here because the question
will come back:

- **Tailwind is a compiler.** It emits CSS for the class names it SEES in
  source files. Page templates live in a store, the builder and a server,
  so the engine's names must be handed to it as a safelist — which is the
  table we have. Validation still needs the table: Tailwind has no list
  of valid names to ask at runtime.
- **A prefix is a must in both kinds of host.** In a host without
  Tailwind an unprefixed engine stylesheet defines `.hidden`, `.block`,
  `.flex`, `.grid`, `.collapse` globally — a hazard for any host CSS or
  third-party widget using one of those words. In a host WITH Tailwind
  the two stylesheets would define the same class names and both write
  `--spacing`; whichever loads later wins, and a host's customised scale
  leaks into the engine or the other way round. With `prefix(ww)` the
  rules are `.ww\:w-4` and the variable `--ww-spacing`; nothing can meet
  them by accident, and the host's own prefix is unrelated. Template data
  would keep `w-2/3`; the renderer would write `ww:w-2/3`.
- **Cascade layers.** Tailwind puts its utilities in `@layer utilities`,
  and unlayered CSS beats any layered rule whatever its specificity. The
  engine would import the utilities UNLAYERED and lower its own defaults
  to `:where()` (zero specificity), or `flex-none` would lose to the
  default `flex: 1 1 0%`.
- **Arbitrary values** (`w-[320px]`) cannot be in a prebuilt stylesheet;
  they would stay inline style. `md:w-[320px]` is impossible without a
  runtime compiler.
- **Three names** the table had, Tailwind 4.3.4 rejects: `-order-last`,
  `max-w-auto`, `max-h-auto`. Fixed in the table either way.
- **Size**, measured, minified then gzipped:

  | Stylesheet                                             | Minified | Gzipped |
  | ------------------------------------------------------ | -------- | ------- |
  | The table as it is (`classes.ts` built; no stylesheet) | 14.5 KB  | 4.3 KB  |
  | Tailwind, the 3 229 names, no breakpoints              | 149 KB   | 19 KB   |
  | Tailwind, the names × `sm md lg xl 2xl`                | 957 KB   | 115 KB  |

  The table is small because it ships a recipe — forty utility
  definitions and a few value lists multiplied on load (about 650 KB of
  heap, 7ms) — where a stylesheet must spell every rule out.

**Decided: without Tailwind.** The prefix would have solved coexistence
either way; what Tailwind buys is `md:` variants at 115 KB, or nothing
new at 19 KB, against 4.3 KB today — and the guidelines' rule against
utility-class frameworks stands. The dependency was taken out again the
same day; the lockfile is as it was. Should responsive variants become a
requirement, the route is known: Tailwind as a dev dependency of the
engine package only, the table as the safelist, the prefix `ww`, the
utilities unlayered, breakpoints for the Flexbox and Sizing sections only
(near 40 KB), the generated stylesheet committed and checked by a test —
about a day's work.

## Later

- **Responsive variants** (`md:flex-row`, `lg:basis-1/2`): inline style
  cannot; the day they are wanted, the way is described above ("Tailwind
  itself, weighed again") — or the table grows its own generated
  stylesheet (option B on top of C), which the same recipe would keep
  small for a few breakpoints.
- **Child selectors** (`space-x-*`, `divide-*`): inline style cannot
  reach the children; a stylesheet could, the day a row's `gap-*` is not
  enough.
- **Drag between rows**: the arrows do the job without a library; a drag
  would need one, and its own gotchas (doc/layout-engines-design.md).
- **A host's own field**: a host that wants an antd select instead of the
  native input reads `LAYOUT_CLASS_NAMES` and reports the same change.

## Moved by drag and drop (12 November 2026): the arrows are gone

The owner's word, after using it: moving is "pure drag and drop, not
arrows". This section REPLACES the four arrows, `moveTarget`,
`MOVE_DIRECTIONS` and "Drag between rows" just above — no library was
needed: the drag is pointer events and rectangles, as css-grid's is.

- **The handle drags.** A cell's whole handle bar is the grip
  (`flex-handle`, its label `flex-handle-label`); the classes field and the
  chrome buttons in it keep their press. While the drag lasts the cell
  stays where it is, faded (`data-dragging`), and the TARGET is marked —
  nothing moves until the drop, so the rectangles measured when the drag
  started stay true.
- **Where it is let go decides** (`dropChange` in `operations.ts`, pure):
  on another cell's MIDDLE the two swap places (`data-drop="swap"`, the
  cell says "swaps places"); on its left or right QUARTER the dragged cell
  goes before or after it, into its row (`data-drop="before" | "after"`, a
  bar on that side); in a row's free room, beside the nearest cell; on the
  STRIP between two rows — one above every row and one under the last
  (`flex-row-drop`, `data-row`), dashed while a drag is on — it takes a
  new row of its own. A drop that would change nothing (on itself, on the
  side of its neighbour it already stands at) is no change at all.
- **The change payload** grew: `{ kind: "swap", id, with }` — each cell
  keeps its own classes, they are its, not the place's — and `own: true`
  on a `move`, a new row of the cell's own BEFORE `row` wherever that is
  (the old `row: -1` / past-the-last still mean a new row at the ends). A
  row left empty goes, as before.
- **A card on flex rows inside a cell** has cells and rows of its own:
  the drag measures only the view's own (`closest('[data-testid=
"flex-rows"]')`), so a drop on a card is a drop on the card's cell.
- **Sizes are still classes.** Nothing is resized by drag here: how wide a
  cell is, is `flex-1`, `basis-1/3`, `w-[320px]` in its field, and a
  dragged divider would have to rewrite words the author typed.
- **Steps:** `I drop the cell "<a>" before|after the cell "<b>"`,
  `I swap the cell "<a>" with the cell "<b>"`, `I drop the cell "<id>"
into a new row above|below row N`, `the cell "<id>" has no arrows to
move it by`; `I move the cell "<id>" up` is gone (`flex-rows.feature`,
  and the greeting of `containers.feature`). Sasha's ask below — a
  regression scenario should a drag ever replace the arrows — is the
  builder scenario of `flex-rows.feature`.

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
