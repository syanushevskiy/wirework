# @wirework/antd-builder

The Wirework page builder as Ant Design components: the page toolbar, the
page's views, a palette of live widget previews, the shared widget form
(input ports, settings, per event the write-back it does by default and
its list of reactions, each with the chosen action's parameters, and the
"Show when" rows of the condition under which the widget shows), and a
panel that edits a placed widget. Render-only throughout — every piece of
state comes from `@wirework/builder`'s hooks, which this package is the
reference implementation of.

Peers: `react`, `antd`. Depends on `@wirework/builder`, `@wirework/react`,
`@wirework/engine`, `@wirework/schema`.

```ts
import "@wirework/antd-builder/styles.css"; // after antd's reset and @wirework/react/styles.css
import { PageToolbar, WidgetBuilder, WidgetEditor } from "@wirework/antd-builder";
```

- `PageToolbar` takes what `usePageToolbar` returns (`toolbar`) and,
  optionally, `texts` — the words for the lock codes and the edit targets
  (`DEFAULT_PAGE_TOOLBAR_TEXTS` is English).
- `PageViews` takes what `usePageViews` returns (`views`) and, optionally,
  `texts` (`DEFAULT_PAGE_VIEW_TEXTS`): the page's views in one list grouped
  into _prebuilt_ and _mine_, the shown one chosen, and Save as / Rename /
  Delete / Share / Import, with a panel under the row for the name or the
  JSON (`viewProblemText` says a refusal in words).
- `WidgetBuilder` takes the registries, the store, the actions, the
  predicates a condition may pick (optional: the standard ones alone), the
  page name, `addLock` (why adding is not offered right now, or
  `undefined`), `lockTexts` (its words, `DEFAULT_ADD_LOCK_TEXTS` unless you
  say otherwise) and `onAdd`.
- `WidgetEditor` takes the cell, the store, the actions, the predicates,
  `bindingsLocked` and `onSave` / `onCancel`. It is a panel the host places
  above the page, never a drawer over it.

The edit session and where pages are saved are the host's — see
`@wirework/builder`.

## The test-id contract

These components expose `data-testid`s that a suite drives the builder
through: `layout-toolbar`, `engine-select`, `engine`, `page-edit`,
`page-save`, `page-cancel`, `page-mode`, `pending-changes`,
`toggle-user-overlay`, `edit-target`, `page-views`, `page-view-select` (with
`data-kind`), `page-view-kind`, `view-save-as`, `view-rename`, `view-delete`,
`view-share`, `view-import`, `page-view-panel` (with `data-panel`),
`view-name`, `view-json`, `view-problem`, `view-apply`, `view-cancel`,
`widget-builder`, `add-widget`,
`add-widget-locked`, `widget-selected`, `widget-palette`, `widget-search`,
`widget-browse`, `widget-card`, `widget-editor`, `widget-save`,
`widget-cancel`, `bindings-locked`, `widget-conditions`,
`widget-conditions-always`, `widget-condition` (with `data-index`), and per
field `port-input-<port>`, `setting-<name>`, `reaction-<event>-<part>`,
`condition-<part>` (`condition-2-<part>` for the second row: `path`, `is`,
`to`, `not`, `sentence`, `problem`, `remove`, `expression` for saved words
the form cannot read; inside a constructor `condition-part-<at>-<part>`
for a test at its place — `0`, `1.0` — and `condition-group-<at>-<part>`
for a group — `root` for the first — with `join`, `not`, `add-test`,
`add-group`, `remove`; `condition-add` for the section and
`condition-appear` / `condition-disappear` for how a conditional widget appears and disappears) — built by the helpers of `@wirework/antd-builder/ids`, which a
suite imports without the components. Renaming any of them is a breaking
change.
