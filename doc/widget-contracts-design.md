# Widget contracts — declarations without components

## Motivation

A widget is a declaration (input ports, events, settings) plus a component.
The declaration is what pages, the builder, reactions and tests depend on;
the component is one rendering of it. A CONTRACT is the declaration alone,
so several implementations — antd (@wirework/antd-widgets), another design
system, plain HTML —
can be swapped without touching pages or configuration.

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
`kind: "button"`. Cells expose `data-kind`; the builder groups widgets by
kind with the contract's description as the group label.

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
- `refresher` — `schedule` port `{ enabled, interval }` (default off, 5 s),
  optional `busy` port, required `changed` (the whole schedule) and required
  `refresh { trigger }`; implementations tick only while enabled and skip a
  tick while busy or hidden (doc/refresher-design.md).

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
implementation test ids. A story file is the conformance set plus
implementation-specific extras.

## Not contracts

`echo`, `counter`, `crash` and the runs table are demo/domain widgets; they
stay plain `defineWidget` definitions. A kind is extracted when a second
implementation or a concrete consumer needs it (Ren's rule).
