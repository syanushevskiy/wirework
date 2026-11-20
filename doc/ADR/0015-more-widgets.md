# ADR-0015: More widgets on Ant Design — which to build next

- **Status:** Accepted — built (the repeater still to be designed)
- **Deciders:** the product owner

## 1. Decision

Of Ant Design's about sixty components, **eight are widget kinds and two
are settings**; the rest are skipped until a page asks. Kinds: `number`,
`date`, `date-range`, `descriptions`, `result`, `dialog`, `steps`,
`timeline`. Settings: `input.rows` and `button.confirm`. All are built,
each with a place on a demo page and a scenario (story WW-34). The
repeater — a layout per record — is a design of its own, not yet made.

## 2. Problem

The ask: which widgets to create next, based on more of Ant Design's
components. The standard kinds covered labels, buttons, choice controls,
tables and the containers; a new one is routine work — a contract, a hook
holding the logic, a render-only component, a conformance set by role, a
story, a scenario.

Most of antd's components are not widgets:

- **Composition primitives** (Flex, Space, Grid, Layout, Splitter, Icon,
  Tooltip, Popover) — a layout engine or a setting does their job.
- **Imperative feedback** (message, notification, Modal.confirm) — nothing
  is placed, something is CALLED; that is the engine's feedback for
  failing actions and requests (WW-18).
- **The host's shell** (Menu, Breadcrumb, Anchor, Affix, FloatButton,
  ConfigProvider, App, Tour, Watermark) — a page does not draw its own
  navigation.
- **Wrappers** (Badge, Spin, Skeleton) — a container or a setting.

What is left: data entry the pages lacked (a number, a date, a range of
dates, a long text), display the pages faked with hand-laid labels (a
record as a fact sheet, a pipeline, a history, an outcome), and feedback a
page places (a dialog, a confirmation before a destructive click).

## 3. Details

### Eight kinds

Each kind is a contract in `packages/widget-contracts/src/<kind>.ts`, a
hook with the logic and a render-only component in `packages/antd-widgets`,
a conformance set by role and name, a playground story, a place on a demo
page and a scenario. Store values stay JSON — a date is a string, never a
`Date` — because the store, the page file, the overlay and the event log
are JSON and the server decides what a date means.

| Kind           | antd                   | Ports                                                                                  | Events                                              | Settings                                                                                                                     | Role                                                  |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `number`       | InputNumber            | `value` — a finite number or `null` (empty), default `null`                            | `changed { value }`, writes back                    | `label`, `min`, `max`, `step`, `precision`, `prefix`, `suffix`, `placeholder`                                                | spinbutton named by the label                         |
| `date`         | DatePicker             | `value` — `"YYYY-MM-DD"`, or an ISO date-time with offset when `withTime`; `""` = none | `changed { value }`, writes back                    | `label`, `withTime`, `picker` (date / week / month / year), `format` (display only), `allowClear`                            | combobox named by the label; typing the text picks it |
| `date-range`   | DatePicker.RangePicker | `value` — `[from, to]` in the same strings, `["", ""]` = none                          | `changed { value }`, writes back                    | `label`, `withTime`, `format`, `allowClear`                                                                                  | group named by the label holding two comboboxes       |
| `descriptions` | Descriptions           | `record` — an object, default `{}`; optional `loading`                                 | `link-clicked { href, property, record }`           | `title`, `items: [{ label, property, cell? }]` (the table's `cell` kinds), `columns`, `size`, `bordered`                     | term / definition pairs (antd renders th / td)        |
| `result`       | Result                 | optional `title`, optional `detail` — strings replacing the static ones                | `clicked { label }` when the action is pressed      | `status` (success / error / info / warning / not-found / forbidden / failed), `title`, `detail`, `action` (a label, or none) | role=status (alert for error / forbidden / failed)    |
| `dialog`       | Drawer / Modal         | `open` — boolean, default `false`                                                      | `changed { open: false }` on close, writes back     | `title`, `as` (drawer / modal), `placement` (drawer), `width`, `inline`, `content` (a layout — `contains`)                   | dialog named by the title                             |
| `steps`        | Steps                  | `current` — a number or a step's key; `failed`                                         | `changed { current }` when `clickable`, writes back | `items: [{ key, label }]`, `direction`, `size`, `clickable`                                                                  | list named by the label, `aria-current` on the step   |
| `timeline`     | Timeline               | `items` — `[{ label?, title?, text, tone?, time? }]`, default `[]`                     | none                                                | `mode` (left / right / alternate), `reverse`, `pending` (the text of an open last item, or none)                             | list; one listitem per entry, the tone as `data-tone` |

Notes:

- `number`: `null` is "empty", because `0` and "nothing" are different
  answers to a form.
- `date` and `date-range` convert at the edge only — two one-liners,
  `toDayjs(value)` and `toIso(dayjs, withTime)`, in `hooks/dates.ts`;
  `dayjs` is a declared peer of the antd package. `format` is what the
  user SEES; the stored string never varies with it, and a test proves it.
  No timezone arithmetic in the widget. `date-range` has no presets: "Last
  7 days" is a button with a `set`.
- `descriptions` is "one row of a table shown as fields": its `items` are
  `tableColumnSchema` without `filter` and `sortable`; it shares the cell
  helpers `cellText` / `cellTone` / `cellHref` (`table-cell.ts`), the
  table's `clicked` decision and its `TableCell` renderer. The antd
  implementation is a factory, `createAntdDescriptions({ cells })`, taking
  the same host renderers as `createAntdTable` — a host's "copy" cell
  works in both.
- `result` carries an optional action, is placed under a `when` like any
  widget and does not know about requests. `not-found`, `forbidden` and
  `failed` are antd's 404 / 403 / 500 pictures by their meaning.
- `dialog` is a CONTAINER with a port: `contains: ["content"]` and
  `io.inputs.open` on one contract. A button opens it with the `set`
  action on the `open` path; the close icon, the mask and Escape emit
  `changed { open: false }`, written back by the default reaction. One
  kind for drawer and modal — `as` is a look. On a page it is a cell like
  any other and takes a slot. The builder's "Edit content" opens its
  layout as the page, like a card's; in edit mode it is shown open and
  inline. The `inline` setting renders it in place
  (`getContainer={false}` in a positioned box) for the palette preview and
  the stories, since a closed dialog has nothing to show.
- `steps`: items are `{ key, label }`, so the builder's named-list form
  adds and names them like tabs; they are a setting only — a port waits
  for a page that needs one. `failed` is a port, not a setting: the
  server's state decides.
- `timeline` takes its items as DATA at a port; an entry has `title` (a
  heading) beside `text`. The contract's `left` / `right` are mapped to
  antd 6's `start` / `end`.

### Two settings

- `input.rows` (integer, optional): above one the field is a textarea with
  that many rows; the ports, `validation`, `pattern` and the alert stay.
- `button.confirm` (string, optional): the text of a confirmation shown on
  the click (antd Popconfirm); `clicked` fires only on OK.

### A date range filters a table

The table-view loader reads `<into>.filterBetween` from the store like
`filterIn` and `filterLike`. A `date-range` bound to
`<view>.filterBetween.<column>` filters the table with no reaction but
"back to page 1, ask again". A range with both ends empty is not sent.

### What is skipped, and why

- `segmented` — `radio-group` with `buttons` is the same control.
- `time` — a `date` with time is the same value.
- `autocomplete`, `cascader`, `tree-select`, `transfer`, `mentions`,
  `color-picker`, `tree`, `calendar` — controlled contracts in the same
  shape, each a few hours, each waiting for a page that needs one.
- `upload` — a file is not JSON; a design of its own (the host's upload
  endpoint, the store holding the server's receipt).
- `list`, a card per record, antd's Card grid — the repeater.
- `badge`, `avatar`, `tooltip`, `image` — a badge is a tabs setting (a
  count per tab from a path), a tooltip a `hint` setting any widget could
  carry, an avatar a `descriptions` cell kind; an image widget (`src`
  port) is cheap and has no page asking for it.
- `dropdown` — a row of buttons shows the choices; back when a page has
  more actions than room.
- `spin`, `skeleton` — a `busy` port on `card` serves the dashboard case;
  weighed with WW-18.
- `message`, `notification`, `modal.confirm` — the engine's feedback for
  failing actions and requests (WW-18), not widgets.

### In the demo

Every kind stands on a demo page with a scenario — the palette alone is
not a feature.

- **Run page**: the pipeline as `steps` (`run.pipeline`, which `run/load`
  derives from the state — widgets never compute, actions do); the run as
  a `descriptions` fact sheet; its history as a `timeline`; "no such run"
  as a `result` under a `when`; Retry opening a `dialog` with a three-line
  Reason (`input.rows`).
- **Pagination page**: a `date-range` "Started between" writing
  `pagination.filterBetween.started`; Delete asks "Delete this run?"
  (`button.confirm`).
- **Settings card**: a `number` on `app.settings.refreshSeconds` and a
  `date` on `app.settings.reportDay`.

Proven by `run-page.feature`, `more-widgets.feature`, `roles.feature` (the
confirmation), the eight conformance sets, the input's `MultiLine` and the
button's `Confirms` / `CancelsConfirm` stories, the loader's
`filterBetween` test and the engine's standard-contracts test. The
conformance sets go by role, never antd's class names; a date is picked by
TYPING it and pressing Enter, never by a calendar click.

### Not built

- **The repeater**: a layout repeated over the rows at a port, in the
  shape of containers — a template per record, each copy's paths scoped to
  its record. Still to be designed; nothing built depends on it.
- Each when a page asks: `upload`, `image`, `dropdown`, the remaining
  controlled kinds.
- With WW-18: a `hint` setting on every widget (Tooltip), a count per tab
  (Badge), a `busy` port on `card` (Spin / Skeleton), feedback for failing
  actions and requests (message / notification, in the engine).

## 4. Options weighed

| Option                                    | Verdict                                                                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A. Everything antd has, one contract each | Rejected. A palette of sixty cards is a worse builder; half are primitives; every contract is a conformance set and a story to maintain. A kind is extracted when a concrete consumer needs it.  |
| B. Data entry first                       | Chosen: `number` (`input` with `type: number` emits a string), `date`, `date-range`. Controlled widgets in the shape of `switch` and `slider` — a `value` port, `changed` written back.          |
| C. Display that replaces hand-laid labels | Chosen: `descriptions` (a record in the table's cell kinds — one widget, one config, a known vocabulary), `result` (the face WW-18 needs for "what failed and a way back"), `steps`, `timeline`. |
| D. Settings, not kinds                    | Chosen wherever the ports do not change: a textarea is `input.rows`, a confirmation is `button.confirm`, segmented is `radio-group` with `buttons`, a time picker a `date` with time.            |
| E. A repeater                             | Not in this set. The hard half of a dashboard is a LAYOUT PER RECORD, and a cell is not data-driven; that is a design of its own, in the shape of containers.                                    |
| F. One generic "field" widget by `type`   | Rejected: one kind per thing, each file readable in thirty seconds.                                                                                                                              |

One kind for drawer and modal because the ports, the events and the
content are the same. `steps`, `timeline` and `dialog` exist because the
run page needs them.

Risks that shaped the edges:

- **Dates and timezones.** The server owns what a date means; the widget
  stores what the user typed, a local day or an ISO string.
- **The dialog in edit mode** is shown inline, never as a portal — a
  portal has no place in a grid.
- **A calendar click** is the flakiest step a suite can have: a date is
  picked by typing.
