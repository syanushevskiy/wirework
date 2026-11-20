# ADR-0009: Containers — a Card (and tabs, panels, drawers) that hold other widgets, added in the builder

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

A container — a card, tabs, a collapse — is a widget whose template holds
a LAYOUT inline (`content: { engine, cells }`, a `content` per tab or
panel), where a table's template holds its columns. It renders the layout
through `NestedLayout`, so a page with several cards is still one page,
shared as one. Built: the card, tabs and collapse with the builder's part
(story WW-27). Not built: the `dialog/open { content }` action.

## 2. Problem

Every widget was a LEAF: it reads ports, emits events, shows one thing,
and a page is leaves placed by a layout engine. A page builder asks next
for a widget that holds OTHER widgets — a `Card` with a title around a
table and its filter, `Tabs` with a layout per tab, `Collapse` panels, a
`Drawer` that opens a form — added in the builder like any widget, with
widgets then put inside it.

A container needs what a leaf does not:

- a place for its CHILDREN, written somewhere (the page template belongs
  to the layout engine, a widget's view model to the widget);
- a way to RENDER them — a widget component receives a view model, a
  read-only store and `emit`, never other cells or the registries;
- EDITING: adding a widget into it and editing the children, with one
  edit session per page;
- SHARING: a page with cards must share as one thing;
- everything that works per page — resolution, boot validation,
  reactions, `load` events, the user overlay, `when` — working inside it.

## 3. Details

A container is a widget whose template holds a layout. Nothing is added
to the core: the cell stays a cell, the engine stays the owner of its
template, and the inner layout goes through the same `resolveTemplate`
and `resolveCells` as the page's. The one new seam is `PageContext` in
the adapter.

```
viewModels.pages.settings.default            the page's layout
  cells: [ label-welcome, card-1, card-2, counter-main ]

viewModels.widgets.settings.card1.default    the card's widget template
  title: "Controls"
  content:                                   the card's layout, inline
    engine: "react-grid-layout"
    cells: [ button-start, button-stop, input-name ]
```

A card with two buttons and an input is ONE cell of the page; its three
widgets are cells of the layout inside the card's template, on their own
engine. Everything shares the page's store and bus, so a button in one
card can set a path a widget in another card reads.

### Contracts and widgets

- A contract names the settings that hold layouts:
  `defineContract({ …, contains: ["content"] })`
  (`WidgetContractInput.contains`, copied by `implementContract`). The
  registry refuses a `contains` that names a setting the widget lacks.
- A layout setting is `pageViewModelSchema.optional()`. `settingFields`
  leaves it out of the form, and an Edit → Save keeps it.
- `layoutsOf(definition, viewModel)` lists the layouts a view model
  holds: a setting that is one, or a list of items (tabs, panels) each
  with a `content`. A layout is named by its PATH in the view model —
  `content`, `tabs.0.content`.
- Contracts in `@wirework/widget-contracts`: `card` (`title`, `content`,
  `size`), `tabs` (`tabs: [{ key, label, content }]`), `collapse`
  (`panels: [{ key, label, content, open? }]`). Each antd implementation
  is one component around `NestedLayout`; `useLayoutItems` renders one per
  tab or panel at its own path (antd mounts a pane when first shown and
  keeps it).
- The `dialog` widget of ADR-0015 is a container on the same mechanism.
  The `dialog/open { content }` action of the actions design is not
  built.

### One chain notation

Inner cell ids are unique within their layout. A path into a layout is
the chain of ids (`innerCellKey`, `chainSteps`), and the layout's path
is part of the chain when it is not `content`:
`card-1/button`, `tabs-1/tabs.0.content/button`. The same notation is
the overlay key of an inner cell, the nested page name its cells emit and
react under (`settings/card-1`), the builder's location (`at: "card-1"`)
and the breadcrumb.

### The adapter (`@wirework/react`)

- `PageContext` carries what `PageView` was given plus the depth;
  `CellKeyContext` tells a container which cell it is in.
- `NestedLayout({ template, path })` resolves the template with the
  context's registries, binds the cells' reactions on the page's bus
  (`bindCellReactions`) and renders through the engine's renderer with
  `editable: false`.
- It fires NO `page · load` of its own: a nested layout is not a page
  opening.
- Its element is `data-testid="layout"` with `data-page`, `data-nested`
  and `data-engine` — never `"page"`, so the outermost page stays the
  page.
- Outside a page (a palette preview, a story without `inside`) it shows
  only how many widgets it holds.
- `CellChrome` offers "Edit content" when the cell's contract `contains`
  a layout and the host passed `onEditLayout(path)`.

### Depth limit and validation

With the content inline a cycle cannot be written, so the one guard is
depth: a layout nested deeper than four is an error at boot, and
`NestedLayout` refuses it at render with a problem placeholder.

`validateViewModels` walks into every held layout with the same
`validateCells`. Problems are located under the cell
(`… (#card-1) content cell[0] (#inner)`), the overlay narrowed with
`innerOverlay`. `resolvePage` is unchanged: each inner layout resolves
when its container renders.

### Editing: one layout at a time

There are no nested edit sessions. A container's content is edited as a
layout, shown AS the page:

- The builder's location is `at`, a chain under the page, on
  `usePageEditing` and `useBuilder`. `layoutPathAt` turns it into the dot
  path of the layout in the view models
  (`widgets.custom.custom-1.default.content`). Every op is the same op,
  writing where the location says.
- `at` is visit state, not an address. The toolbar shows a breadcrumb
  (`usePageToolbar` `crumbs` / `goTo`): `builder › custom-1`. The rules
  for moving between a page and the layouts inside it are the builder's
  `useLayoutNavigation`; the host keeps the `at` state and its Save page.
- A session is ONE layout's. "Edit content" and a breadcrumb SAVE the
  page first, as Save page does. "Edit content" then opens the layout
  inside in edit mode, with a session of its own; a breadcrumb opens the
  layout above in view mode.
- A layout's engine is chosen in the toolbar while the layout is empty
  and locked once a widget is placed. A card may hold a gridstack grid on
  a react-grid-layout page; there is no conversion between engines.

### Adding, wrapping, removing

- **Adding a container** starts its layouts empty on the engine of the
  layout it is placed in (`withEmptyLayouts`): a card's `content`, a
  `content` for each default tab or panel. Its cell is appended TALL
  (`appendCell`'s `CellSize` hint; the grid engines give twice their
  rows). `onAdded` names what was placed (`PlacedWidget`: the id, the
  widget, the paths of its layouts), and the host opens a placed
  container at once, so the next Add goes inside it.
- **Tabs and panels are named and added in the form.** `settingFields`
  reports an array of entries with a `key` and a `label` as a setting of
  kind `items` (an entry's other primitive fields, such as a panel's
  `open`, as `itemFields`). The form (`useWidgetForm`: `addItem`,
  `removeItem`, `setItemLabel`, `setItemValue`) shows a row per entry,
  starting from the contract's default. An entry's KEY is made from its
  label (`Run history` → `run-history`, numbered when taken) or kept as
  saved. A renamed entry keeps its layout (`ItemDraft.original`); an
  added one gets an empty layout on save; the cells inside a removed one
  lose their builder-owned templates. Field ids come from `itemFieldId`
  (`setting-tabs-label`, `setting-tabs-2-label`, `setting-tabs-add`,
  `setting-tabs-remove`, `setting-panels-open`).
- **"Wrap in a card"** (`wrapCell(cellId, widget)`, base target only) is
  one op: a new container cell APPENDED, tall, its first layout the
  engine's empty one with the cell inside, the cell gone from the layout
  it was in. An engine's `appendCell` has no position, so the card lands
  where the layout puts a new cell. The host names the container and the
  button (`PageView.wrapCell: { label, onWrap }`). There is no frame
  concept: a card with one widget is the frame.
- **Removing a container** drops its builder-owned template and the
  templates of the cells inside it that nothing else references
  (`cellsWithin` walks the layouts inside containers; `isModelReferenced`
  uses it).

### Sharing, views and the user's own layout

- **A view** (ADR-0006) is the page's layout: it names the card's cell
  and model path like any cell's. The card's template, content included,
  is the page's configuration. Share and Import of a view need nothing
  new; a page with its widget templates travels as the page file of
  ADR-0011.
- **A user's own layout inside a container** is the container's `content`
  setting in their overlay, held PER VIEW of the page:
  `viewCells["my-own"]["card-1"].settings.default.content` (the whole
  `tabs` list for a tab's content) — ADR-0006, "A view holds the layouts
  inside its containers".
- With the overlay ON, the layout shown `at` the chain is the one the
  USER sees (`locateLayoutAt`), and every op writes their own copy of it
  (`updateUserLayoutAt`). The cells inside are customised and removed
  under their chain keys (`cells["card-1/button"]`, shown through
  `innerOverlayAt`). The container's own form keeps that copy. Every
  container has "Reset to original" in edit mode.
- Add stays the shared page's: a user's copy takes no new widget.

### Tests

`nesting.test.ts`, `NestedLayout.test.tsx`, the builder's
`use-page-editing.test.tsx` and `use-builder.test.tsx`, the `antd-card` /
`antd-tabs` / `antd-collapse` stories with their conformance sets
(`inside()` lends them a list engine), and `containers.feature`.

### Open to the product owner

- Whether a card's content should be editable IN PLACE some day (a
  nested session), or stays "a layout edited as a layout".
- Whether regions dragged as a whole (option B) are wanted for
  dashboards — a layout engine of its own, independent of this.
- Leaving a layout SAVES its session without asking. Whether the builder
  should ask first, or offer to discard.

## 4. Options weighed

| Option                                             | What it is                                                                                                                                | Verdict                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Cells with a parent                             | Every cell gets `parent?: { cell, slot }`; the engine renders the top-level cells, the adapter renders children into a container's slots. | Rejected. It changes the core cell shape, every engine's template, the renderer contract, the builder's Add and drag in every engine — every package for one widget.                                               |
| B. Sections as a layout engine                     | A new engine whose template is a list of sections, each holding a child engine's template. A pure plugin.                                 | Deferred. A section is not a widget: no ports, events, condition or place in the palette, and `appendCell` cannot say which section. Right for a designer laying out regions, wrong for "add a card with a title". |
| C. A frame on any cell                             | A cell's template gets `frame: { kind: "card", title? }` and the adapter wraps the widget.                                                | Folded into D as "Wrap in a card". It covers one widget per card and nothing else — no tabs, no drawer — and would be a second concept beside D.                                                                   |
| D. A widget whose template holds a layout (chosen) | The container's layout is a setting of its own template, rendered by the one mechanism that renders layouts.                              | Chosen. One thing to learn answers the card, tabs, panels and the dialog; nothing new at the top of the view models; children resolve, validate, react and load as every layout does.                              |
| D with the layout as a page of its own             | The card's layout stored as a page template (`pages["settings-card-1"]`).                                                                 | Dropped. A view exports one layout and a user's own view copies one layout, so the cards would ship without their content. Inside the card's template, the content goes wherever the template goes.                |

Why no nested edit sessions: containers are where page builders get into
trouble — nesting without end, drag between containers, who resolves
first. Editing one layout at a time, with a breadcrumb, avoids all three
and needs only a location in the builder. The depth limit of four is for
the builder's sake more than the engine's.
