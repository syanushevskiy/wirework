# Widget previews — a palette instead of a dropdown

## Motivation

A builder is used by people who choose by look. A dropdown of type names
("antd-counter") asks them to know the catalog; a palette of live
previews shows it. Previews are LIVE renders of the widget itself, never
screenshots: images rot the moment a widget changes and cannot show an
application's own design system.

## Design

- **`preview` declaration** on the widget definition (data, next to
  `description`): `{ seed?, viewModel? }` — sample store state the input
  ports read, and the view-model template (bindings + settings) to render
  with. A contract may carry a default preview for its kind; an
  implementation may override it.
- **`WidgetPreview`** (`@wirework/react`): renders one definition in an
  isolated sandbox — its own seeded store and dead-end bus, a cell-scoped
  `emit` that validates and goes nowhere, the per-cell error boundary, no
  reactions. Non-interactive (`inert`, no pointer events) and scaled to a
  fixed frame. A widget whose preview view model fails validation shows
  "no preview"; a widget that crashes shows the boundary's placeholder —
  the catalog tells the truth.
- **Palette** (playground builder): a search box with autocomplete and the
  "Add widget" action on one line (the search matches a widget's type, its
  description or the contract kind). The catalog is a PICKER: the cards
  appear under the search while it is focused or holds a query, and fold
  away once the user moves on to the form, so the panel is one line tall at
  rest. Cards flow into as many columns as the panel is wide; each is a
  real button (keyboard-navigable) holding the preview, the type, the
  contract kind and the description; clicking selects the widget and opens
  the same form as before. The dropdown is gone.
- Previews are sample data and labelled as such in the palette.

## Reuse

The preview declaration is the natural default story for Storybook and a
visual-regression target; the harness there stays the richer sandbox
(reactions bound, store readout).

## Phases

| Phase | Work | Status |
|---|---|---|
| 1 | `preview` on definitions and contracts; `WidgetPreview`; palette replaces the dropdown; previews for every example widget and the standard contracts; scenarios | built |
| 2 | Search and filtering; one compact kind-tagged grid | built |
| 2b | Lazy rendering of cards as they scroll into view | not started |
| 3 | Drag a card from the palette onto the grid (react-grid-layout / gridstack external drop) | not started |
| 4 | Storybook default story from the preview declaration | not started |
