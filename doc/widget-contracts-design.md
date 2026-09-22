# Widget contracts — declarations without components

## Motivation

A widget is a declaration (input ports, events, settings) plus a component.
The declaration is what pages, the builder, reactions and tests depend on;
the component is one rendering of it. A CONTRACT is the declaration alone,
so several implementations — antd (@wirework/antd-widgets), another design
system, plain HTML — share ports, events, settings, builder forms and
conformance tests.

What swapping costs today: a cell names the IMPLEMENTATION (`widget:
"antd-button"`), not the kind, so moving a page to another design system
means changing `widget` in its cells (base and user templates); every
template, reaction and setting stays valid because the contract is the
same. Cells referencing a kind that the host maps to an implementation is
the step that would make it free — not built (team-tiger review: Alexei
wants it, Ren wants a second real implementation first).

## Shape (`@wirework/schema`, `contracts/widget-contract.ts`)

```ts
const buttonContract = defineContract({
  kind: "button",                       // kebab-case kind
  description: "...",                   // what implementations must do
  io: { inputs: {} },
  events: { clicked: { payload: z.object({ label: z.string() }) } },
  settings: z.object({ label: z.string().default("Click me") }),
});
// contract.viewModel is DERIVED: inputs + on + settings — no drift.
```

Contracts are data (zod + the contract types). `ContractProps<typeof c>`
gives an implementation its typed view model and `emit`.

## Implementing (`@wirework/react`)

```ts
export const antdButton = implementContract(buttonContract, {
  type: "antd-button",                 // THIS implementation's registry name
  component: AntdButton,               // props: ContractProps<typeof buttonContract>
});
```

Ports, events and view model come from the contract; the definition records
`kind: "button"`. Cells expose `data-kind`; the builder's palette tags each
card with its kind and searches by it.

The widget registry, created with the contract registry
(`createRegistry({ contracts })`), refuses a widget whose `kind` is not a
registered contract, or whose ports or events differ from that contract's —
so "implements button" is checked, not just a label. Both registries hold
their items to the same DECLARATION rules (a view-model validator, ports
with a value validator and a default that passes it, kebab-case events with
payload validators), so a broken contract is rejected when it registers,
not when its first widget does.

## Standard kinds (`@wirework/widget-contracts`)

- `label` — optional `text` port, `text` + `tone` settings (semantic roles,
  never raw colours); implementations render the text and expose the tone.
- `button` — `clicked { label }`; implementations render role=button with
  the caption as its accessible name.
- `input` — controlled: `value` port (default ""), required `changed
  { value, valid, message? }` (primary `value`), settings label /
  placeholder / type / validation (closed rule set) / pattern /
  patternMessage; implementations render a textbox with `aria-invalid`
  and an `alert` holding the message.
- `pagination` — `page` and `total` ports, optional `pageSize` port
  (falling back to the `pageSize` setting), required `changed { page,
  pageSize }` (primary `page`); settings showSizeChanger / showTotal / size.
- `refresher` — `schedule` port `{ enabled, interval }` (default off, 5 s),
  optional `busy` port, required `changed` (the whole schedule) and required
  `refresh { trigger }`; implementations tick only while enabled and skip a
  tick while busy or hidden.

The basics every UI library has:

- `select` — controlled: `value` port (default "" = nothing chosen),
  optional `options` port falling back to the `options` setting, required
  `changed { value }`; a combobox named by `label`, clearing emits "".
- `multi-select` — like `select` with a string-array `value` (default []),
  required `changed { value }` carrying every chosen value; a chosen value
  no longer on offer is shown as it is (pruning it is the job of whoever
  changed the options — the demo's dependent filters do it in an action).
- `tag` — optional `text` port, `text` + `tone` settings (`default`, `info`,
  `success`, `warning`, `danger`); an empty bound value shows the static text.
- `checkbox` — controlled: `checked` port (default false), required
  `changed { checked }`; role=checkbox named by `label`.
- `progress` — `percent` port shown clamped to 0–100, `label`, `tone`,
  `showValue`; role=progressbar named by `label`.
- `alert` — optional `title` port, `title` / `description` / `tone`
  (`info`, `success`, `warning`, `danger`) / `showIcon`; role=alert.
- `table` — `rows` port (array of objects, default [], suggested path name
  `data`), optional `loading` and `columns` ports; settings `columns`
  (`{ title, property, cell? }`), `rowKey`, `emptyText`; events `load` (once
  when it appears), `row-selected { key, row }`, `link-clicked { href, key,
  property, row }`. A column's `cell` is one of the CONTRACT's predefined
  kinds (`table-cell.ts`: `text`, `tag { tones }`, `link { to }`, `custom
  { name, params }`), so every implementation shows them the same; the
  helpers `cellText`, `cellTone`, `cellHref` are shared and unit-tested.
  Implementations expose `data-row-key`, `data-property`, `data-cell` and a
  tag cell's `data-tone`, and decide clicks in ONE place: a plain click on
  a link is `link-clicked`, never `row-selected`; interactive content in a
  cell (a link, a button, a form control) owns its click and never selects
  the row — so a host renderer that ACTS (the playground's "copy" button)
  needs nothing of its own. A renderer never touches the store; it may act
  on the browser (the clipboard). The antd implementation is
  a factory, `createAntdTable({ cells })`, so a host adds renderers by name
  without a contract change (the levels of customizing a server-described
  table are in `packages/table-view/src/index.ts`).
- `filter-bar` — `filters` port (`[{ id, label, options }]`, data the
  server describes) and `value` port; required `changed { value }`.

The validation RULE SET belongs to the contract (builders must render it
uniformly); the rule semantics are implemented per widget package and
checked by conformance stories.

## Application-defined kinds

`defineContract` in the app, `implementContract` for its widget, register
both at boot (`createContracts().register(contract)`, `registry.register
(widget)`). The playground does this with `status-badge`
(apps/playground/src/contracts, src/widgets).

## Conformance (Storybook)

`@wirework/antd-widgets/stories` exports a harness and, per standard
contract, a conformance story set with interaction tests
(`labelConformance`, `buttonConformance`, `inputConformance`). "Implements
the contract" means those stories pass against your component. They query
by accessible semantics (role, name, aria-invalid, alert), never by
implementation test ids. A story file is the **Playground** first, then the
conformance set, then implementation-specific extras.

The Playground (`playground(definition)`, same export) is generated from the
declaration, so a new widget gets it with one line: controls for EVERY
setting (grouped "Settings"; lists and objects as object controls, with the
schema's descriptions and defaults), for the DATA at every input port
(grouped "Inputs (store data)": the control writes the store, and follows
when the widget's own reaction writes it), and for the cell width and the
store readout ("Story"). It starts from the widget's `preview` (the seed
the palette renders it with); ports the preview leaves unbound get
generated paths, so they have a control too. Events land in the Actions
panel.

Open gaps (team-tiger review, Sasha and Katya): nothing RUNS the play
functions yet (no Storybook test runner in `pnpm test` or CI); pagination
and refresher have no conformance set; the sets live in the antd package,
so another implementation would depend on it — they belong next to the
contracts.

## Not contracts

`echo`, `counter` and `crash` are demo/test widgets; they
stay plain `defineWidget` definitions. A kind is extracted when a second
implementation or a concrete consumer needs it (Ren's rule).
