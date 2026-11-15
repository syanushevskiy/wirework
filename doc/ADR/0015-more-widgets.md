# ADR-0015: More widgets on Ant Design — which to build next

- **Status:** Accepted — built (the repeater still to be designed)
- **Date:** 2026-11-09
- **Deciders:** the product owner

## Description

Written 9 November 2026 (story WW-34; built the same day — "Built" at the
end). The ask: which widgets to create next, based on more of Ant Design's
components.

Ant Design 6 has about sixty components; Wirework has twenty-three
standard kinds, and most of the components left are not widgets ("What
there is", below). The question: which of the remaining components deserve
a contract, in which order, and which are better as a setting on a widget
that exists?

## What there is

Twenty-three standard kinds (`@wirework/widget-contracts`), every one
implemented on antd 6 (`@wirework/antd-widgets`) with a conformance set and
a generated playground: label, button, input, pagination, refresher,
select, multi-select, tag, checkbox, progress, alert, table, filter-bar,
infinite-table, switch, slider, radio-group, rate, statistic, divider, and
the containers card, tabs and collapse. Six of them arrived in one day on
2 November (WW-26) because the pattern is routine: a contract (ports,
events, settings, a preview), a hook holding every line of logic, a
render-only component, a conformance set by accessible role, a playground
story, a scenario. The demo uses eighteen labels, ten buttons and eight
echoes — the run page alone is four labels, a tag and a badge laid out by
hand to show one record.

Ant Design 6 has about sixty components. Most are not widgets:

- **Composition primitives** — Flex, Space, Grid, Layout, Splitter, Icon,
  Tooltip, Popover. A layout engine or a setting does their job; a page
  author never places a Tooltip.
- **Imperative feedback** — message, notification, Modal.confirm. Nothing
  is placed; something is CALLED when an action fails or succeeds. That is
  WW-18's business (the engine surfacing a request's or an action's
  outcome), not a widget's.
- **The host's shell** — Menu, Breadcrumb, Anchor, Affix, FloatButton,
  ConfigProvider, App, Tour, Watermark. The playground's routes and menu
  are the host's; a page does not draw its own navigation.
- **Wrappers** — Badge, Spin, Skeleton wrap another component. In Wirework
  that is a container or a setting, not a kind of its own.

What is left is data entry the pages lack (a number, a date, a range of
dates, a long text), display the pages fake with labels (a record as a
fact sheet, a pipeline, a history, an outcome), and feedback a page places
(a dialog, a confirmation before a destructive click).

## Options considered

**A. Everything antd has, one contract each.** Rejected. A palette of sixty
cards is a worse builder than a palette of thirty; half the components are
primitives whose job the engines and settings already do; every contract
is a conformance set and a story to maintain forever. The rule from the
contracts design stands: a kind is extracted when a concrete consumer
needs it.

**B. Data entry first.** The six of WW-26 were all choice widgets; what a
settings page and a filter row still cannot do is take a NUMBER (`input`
with `type: number` emits a string), a DATE, a RANGE of dates, or a
paragraph. These are controlled widgets in the exact shape of `switch`
and `slider` — a `value` port, `changed` written back — and each is a few
hours. Chosen as the first half of the set.

**C. Display that replaces hand-laid labels.** The run page shows a record
as four labels and a tag in a grid: a `descriptions` widget (antd
Descriptions) shows a record as labelled fields with the TABLE's cell
kinds — text, tag, link — so a fact sheet is one widget and one config,
in the vocabulary the table already taught. The error label under a
`when` is a `result` (antd Result: a status, a title, a line of detail, an
action) — the face WW-18 needs for "what failed and a Retry". A run's
pipeline is `steps`, its history a `timeline`. Chosen; `descriptions` and
`result` first, `steps` and `timeline` with the demo page that needs them.

**D. Settings, not kinds.** A textarea is an `input` whose `rows` setting
is above one — same ports, same validation, same conformance set. A
confirmation before a destructive click is a `confirm` setting on
`button` (antd Popconfirm): the click emits `clicked` only after the user
confirms. Segmented is a `radio-group` with `buttons: true`, which exists.
A time picker is a `date` with time. Chosen wherever it applies: two
settings instead of four kinds.

**E. A repeater.** The objection to the whole list: the hard half of a
dashboard is a LAYOUT PER RECORD — a card per run, a row of widgets per
alert — and no component on the list does that; antd's List and Card grid
are exactly that need, and in Wirework a cell is not data-driven. Not a
widget: a design of its own, in the shape of containers (a template
repeated over the rows at a port, each copy's paths scoped to its record).
Noted as a design to be held between the two builds (phase 2, below), not
folded into this story: without it the run page is the only page that
improves.

**F. One generic "field" widget that renders by a `type` switch.**
Rejected: one kind per thing, each file readable in thirty seconds.

## Decision

B, C and D together, as one set: **eight kinds and two settings**.

- Data entry the pages lack (B): `number`, `date`, `date-range`.
- Display that replaces hand-laid labels (C): `descriptions`, `result`,
  `steps`, `timeline`.
- Feedback a page places: `dialog` — one kind for a drawer and a modal.
- Settings where the ports do not change (D): `input.rows` for a long
  text, `button.confirm` for a confirmation before a destructive click.
  The ports did not change, so the kind did not.

A is rejected: nothing from the "skipped" list below is built until a page
asks. E, the repeater, is not part of this set; it is a design of its own,
still to be held. F is rejected.

The order follows what a user gets: filter the runs by when they started;
see a run as a fact sheet instead of scattered labels; a failure that says
what failed and offers a way back; Delete asks before it acts; a form in a
dialog. `descriptions` goes first — it deletes more demo configuration
than it adds. `steps`, `timeline` and `dialog` are built only with the
demo page that needs them, which the run page does.

## The design

### Eight kinds

Every new kind follows the house pattern: a contract in
`packages/widget-contracts/src/<kind>.ts`, a hook with the logic and a
render-only component in `packages/antd-widgets`, a conformance set in
`stories/conformance.tsx` querying by role and name, a playground story,
the engine's standard-contracts test extended, a place on a demo page and a
scenario. Store values stay JSON — a date is a string, never a `Date` —
because the store, the page file, the overlay and the event log are all
JSON, and the server decides what a date means. No new abstraction is
needed: `implementContract` and `usePort` already compose.

| Kind           | antd                   | Ports                                                                                  | Events                                              | Settings                                                                                                                     | Role                                                  |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `number`       | InputNumber            | `value` — a finite number or `null` (empty), default `null`                            | `changed { value }`, writes back                    | `label`, `min`, `max`, `step`, `precision`, `prefix`, `suffix`, `placeholder`                                                | spinbutton named by the label                         |
| `date`         | DatePicker             | `value` — `"YYYY-MM-DD"`, or an ISO date-time with offset when `withTime`; `""` = none | `changed { value }`, writes back                    | `label`, `withTime`, `picker` (date / week / month / year), `format` (display only), `allowClear`                            | combobox named by the label; typing the text picks it |
| `date-range`   | DatePicker.RangePicker | `value` — `[from, to]` in the same strings, `["", ""]` = none                          | `changed { value }`, writes back                    | `label`, `withTime`, `format`, `allowClear`, `presets` (`[{ label, from, to }]`)                                             | group named by the label holding two comboboxes       |
| `descriptions` | Descriptions           | `record` — an object, default `{}`; optional `loading`                                 | `link-clicked { href, property, record }`           | `title`, `items: [{ label, property, cell? }]` (the table's `cell` kinds), `columns`, `size`, `bordered`                     | term / definition pairs (antd renders th / td)        |
| `result`       | Result                 | optional `title`, optional `detail` — strings replacing the static ones                | `clicked { label }` when the action is pressed      | `status` (success / error / info / warning / not-found / forbidden / failed), `title`, `detail`, `action` (a label, or none) | role=status (alert for error / forbidden / failed)    |
| `dialog`       | Drawer / Modal         | `open` — boolean, default `false`                                                      | `changed { open: false }` on close, writes back     | `title`, `as` (drawer / modal), `placement` (drawer), `width`, `content` (a layout — `contains`)                             | dialog named by the title                             |
| `steps`        | Steps                  | `current` — a number or a step's key; optional `items`                                 | `changed { current }` when `clickable`, writes back | `items: [{ key, title, description? }]`, `direction`, `size`, `clickable`, `status` of the current step                      | list named by the label, `aria-current` on the step   |
| `timeline`     | Timeline               | `items` — `[{ label?, text, tone?, time? }]`, default `[]`                             | none                                                | `mode` (left / right / alternate), `reverse`, `pending` (the text of an open last item, or none)                             | list; one listitem per entry, the tone as `data-tone` |

Notes on the table:

- `number`: the contract's description names `null` as "empty", because
  `0` and "nothing" are different answers to a form.
- `descriptions` is "one row of a table shown as fields": its `items` are
  `tableColumnSchema` without `filter` and `sortable` — literally that
  schema, or two configurations for one record drift apart —, the cell
  kinds and the helpers `cellText` / `cellTone` / `cellHref` shared (kept
  in `table-cell.ts` and imported, never copied), and the antd
  implementation a factory `createAntdDescriptions({ cells })` taking the
  same host renderers as `createAntdTable` — the playground's "copy"
  button then works on the run page's reference for nothing.
- `dialog` is a CONTAINER with a port: `contains: ["content"]` and
  `io.inputs.open` are independent fields of a contract, so the builder's
  "Edit content" opens its layout as the page like a card's, and in edit
  mode the dialog is shown open and inline (a portal has no place in a
  grid). A button opens it with the `set` action on the `open` path; the
  close icon, the mask and Escape emit `changed { open: false }`, written
  back by the default reaction. One kind for drawer and modal because the
  ports, the events and the content are the same; `as` is a look.
- `date` converts at the edge only — two one-liners, `toDayjs(value)` and
  `toIso(dayjs, withTime)`, in the hook, so the component stays
  render-only; dayjs is already in the bundle as antd's peer
  (the lockfile holds it through `@rc-component/picker`), so it becomes a
  declared peer of the antd package and nothing else changes. `format` is
  what the user SEES; the stored string never varies with it — or two
  pages store two strings for one day. The contract says so and a test
  proves it.
- `result` carries an optional action so WW-18's "Retry" is one widget
  wired to one reaction, and is placed under a `when` like any widget; it
  does not know about requests. `not-found`, `forbidden` and `failed` are
  antd's 404 / 403 / 500 pictures by their meaning, not their numbers.
- `steps` and `timeline` take their items as DATA at a port first, a
  setting second, like `select`'s options: a run's pipeline comes from the
  server.

### Two settings

- `input.rows` (integer, optional): above one the field is a textarea with
  that many rows; everything else — the ports, `validation`, `pattern`,
  the alert — stays. Conformance gains one story: a textarea named by the
  label takes a line break.
- `button.confirm` (string, optional): the text of a confirmation shown on
  the click; `clicked` fires only on OK (antd Popconfirm, role=dialog
  within the button's cell). Conformance gains two stories: OK emits,
  Cancel does not.

### What is skipped, and why

- `segmented` — `radio-group` with `buttons` is the same control.
- `time` — `date` with `withTime` and `picker: "time"` is the same value.
- `autocomplete`, `cascader`, `tree-select`, `transfer`, `mentions`,
  `color-picker`, `tree`, `calendar` — controlled contracts in the same
  shape, each a few hours, each waiting for a page that needs one; adding
  them before that is option A.
- `upload` — a file is not JSON; the store and the actions carry values,
  not blobs. A design of its own (the host's upload endpoint, the store
  holding the server's receipt).
- `list`, a card per record, antd's Card grid — the repeater (option E).
- `badge`, `avatar`, `tooltip`, `image` — a badge is a tabs setting (a
  count per tab from a path) and a tooltip a `hint` setting any widget
  could carry; an avatar is a `descriptions` cell kind; an image widget
  (`src` port) is cheap and has no page asking for it. Later.
- `dropdown` (a button with a menu of actions emitting `clicked { key }`)
  — a row of buttons shows the choices and needs no new kind; back when a
  page has more actions than room.
- `spin`, `skeleton` — a `busy` port on `card` (a loading look over its
  content) serves the dashboard case without a wrapper kind; weighed with
  WW-18.
- `message`, `notification`, `modal.confirm` — the engine's feedback for
  failing actions and requests (WW-18), not widgets.

### The demo

The palette is not a feature: every new widget lands on a demo page with a
scenario from day one — otherwise the conformance set is its only proof
and a tester has nothing to test.

- Runs page: a `date-range` "Started between" above the table writing
  `runs.between`, sent by the table's `load` as a `between` group of the
  request; the fake server stamps every run with a `started` time (the id
  spread over the last thirty days) and filters by it. Delete run gets
  `confirm: "Delete this run?"`; the scenario confirms.
- Run page: the status badge, the reference tag and the message label
  become one `descriptions` (Status as a `tag` cell with the state tones,
  Reference as text with the host's "copy" renderer, Message, Inbound);
  the error label becomes a `result` (`status: not-found`, the title from
  `runs.error`, the action "Back to runs") under the same `when`; a
  `steps` of the run's pipeline (queued, running, finished; `current` from
  the state) across the top; a `timeline` of the run's history from a new
  `history` field of the fake run. Retry becomes a button opening a
  `dialog` ("Retry run", a textarea "Reason" with `rows: 3`, a Retry button
  running `runs/retry` and closing it through `set`, Cancel). The css-grid
  picture changes with it; `css-grid.feature` follows.
- Settings page, in the preferences card: a `number` "Refresh every
  (seconds)" on `app.settings.refreshSeconds`, a `date` "Report day" on
  `app.settings.reportDay`, both echoed by `echo-settings`.

The conformance sets stay by role, never by antd's class names:
`spinbutton`, `combobox` with a typed
date (the scenario types `2026-11-09` and presses Enter — never clicks a
calendar cell, which moves with the month), `dialog`, `status` / `alert`
(the alert role on the failing statuses, so a failing page is announced),
`listitem`, and the th / td text of a description. `I confirm` and
`I cancel` serve every Popconfirm and dialog alike. New steps:
`I enter the number <n> in "<label>"`, `I pick the date
"<date>" in "<label>"`, `I pick the dates "<from>" to "<to>" in "<label>"`,
`the field "<label>" of the descriptions reads "<text>"`, `the result says
"<title>"`, `the dialog "<title>" is open / closed`, `I confirm`,
`I cancel`, `the current step is "<title>"`, `the timeline has N entries`.

## Risks to watch

The pattern is routine; the risks are not the widgets but their edges.

- **Dates and timezones.** The server owns what a date means; the widget
  stores what the user typed, and the fake server compares the texts. The
  contract pins it: a local day, an ISO string, no timezone arithmetic in
  the widget.
- **The dialog in edit mode** is shown inline, never as a portal while
  editing.
- **The first container with a port.** Before the dialog is built, confirm
  that `contains` and a port on one contract behave in `NestedLayout` and
  in the builder's "Edit content".
- **The run page's grid picture** changes under the css-grid scenarios:
  the page and the scenarios change in one commit.
- **A calendar click** is the flakiest step a suite can have: a date is
  picked by typing.

## Phases

1. **The dashboard set — 1½ days.** `number`, `date`, `date-range`,
   `descriptions`, `result`; `input.rows` and `button.confirm`; the run
   page on `descriptions` and `result`, the runs page's date range with the
   fake server's `started` and `between`, the settings card's number and
   date, Delete run confirming; conformance sets, playgrounds, the
   standard-contracts test, `more-widgets.feature` extended and a
   `run-page.feature`.
2. **The repeater design — ½ day.** A layout repeated over the rows at a
   port (option E), in the shape of containers.
3. **The shell set — 1½ days.** `dialog`, `steps`, `timeline`; Retry as a
   dialog with a textarea, the pipeline and the history on the run page
   from the fake server's new fields; conformance and scenarios.

## Built (9 November 2026)

Phases 1 and 3 in one day; the repeater design (phase 2) is still to be
held — nothing built depends on it. What stands, and where the build
departed from the table above:

- **Eight kinds** in `@wirework/widget-contracts` (`number`, `date`,
  `date-range`, `descriptions`, `result`, `dialog`, `steps`, `timeline`),
  each implemented in `@wirework/antd-widgets` with a hook holding the
  logic, a conformance set by role, a playground story, and a place on a
  demo page. **Two settings**: `input.rows` (a TextArea) and
  `button.confirm` (a Popconfirm). `dayjs` became a declared peer of the
  antd package; the conversion is two one-liners in `hooks/dates.ts`.
- **Departures.** `steps` items are `{ key, label }` (not `title`) so the
  builder's named-list form adds and names them like tabs; `steps` takes
  its items as a setting only (a port waits for a page that needs one),
  and `failed` is a second port instead of a `status` setting — the
  server's state decides. `date-range` has no `presets` (no page asks; "Last 7 days" is a button with a `set`). `dialog`
  gained an `inline` setting: a dialog has nothing to show while closed,
  so the palette preview and the stories render it in place
  (`getContainer={false}` inside a positioned box); on a page it is a
  cell like any other and takes a slot. `timeline` entries have `title`
  (a heading) beside `text`, and antd 6's `start` / `end` names are
  mapped from the contract's `left` / `right`. `result` is role=status,
  role=alert for the failing outcomes. `descriptions` reuses the
  table's `clicked` decision and `TableCell` renderer — one place decides
  what a click landed on, one component shows a cell.
- **The loader** (`@wirework/table-view`) reads `<into>.filterBetween`
  from the store like `filterIn` and `filterLike`: a `date-range` bound to
  `runs.filterBetween.started` filters the runs table with no reaction
  but "back to page 1, ask again". A range with both ends empty is not
  sent. The fake server stamps every run with `started` (the seeded six
  on 1–6 November, the generated ones on October days), hides the column
  as it hides `message`, and compares the texts.
- **The run page** (css-grid, six rows): the name, the status badge and
  Back across the top; the pipeline (`run.pipeline`, which `run/load`
  derives from the state — widgets never compute, actions do); the run as
  a fact sheet (a tag per state, the host's "copy" on the reference,
  message, inbound, started) with its history beside it (the server tells
  it, retries included); the "no such run" result with "Open the runs
  list"; Retry opening a modal with a three-line Reason, Cancel and "Run
  again" (`runs/retry`: the server queues the run again with the reason,
  the page loads it anew, the dialog closes).
- **The runs page**: "Started between" in the right column (eleven cells);
  Delete run asks "Delete this run?" first. **The settings card**: "Refresh
  every" (a number, `null` while empty) and "Report day" (text).
- **The roles page** (`/demo/roles`, the seventh page): ONE card on flex
  rows with two templates — `default`, the input everyone sees and a line
  saying how it works; `admin`, the same plus a button with the echo of
  what it sets — and `roles.json` picking `admin` for the admin
  (doc/ADR/0012-roles.md, the role layer's cell template choice). A first
  cut had two cards; a second had the two admin widgets in the one card
  under a condition (`app.user.roles has the role admin`); the product
  owner chose the role layer (9 November 2026) so that what the admin sees
  is read in `roles.json`. The condition stays the builder's other way, in
  its own scenario.
- **Verified by** `run-page.feature` (four scenarios), `more-widgets.feature`
  (the previews, the settings card, the runs range, the long text),
  `roles.feature` (the roles page, the same thing built in the builder,
  Delete confirming), the eight
  conformance sets and the input's `MultiLine` and the button's `Confirms`
  / `CancelsConfirm` stories, the loader's `filterBetween` test, the
  engine's standard-contracts test. 233 scenarios, 169 stories.

## Later

- The repeater, as designed in phase 2 — still to be designed.
- `upload`, `image`, `dropdown`, the remaining controlled kinds
  (autocomplete, cascader, tree-select, transfer, mentions, color-picker,
  tree, calendar) — each when a page asks.
- A `hint` setting on every widget (Tooltip), a count per tab (Badge), a
  `busy` port on `card` (Spin / Skeleton) — with WW-18.
- Feedback for failing actions and requests (message / notification) —
  WW-18, in the engine.
