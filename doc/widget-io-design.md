# Widget IO — typed inputs; writes are events

## Motivation

Widgets bind to the store through paths in their view model. Nothing
machine-readable used to say which fields are bindings or what TYPE of
value lives at a bound path. That blocked generic tooling — a builder
cannot ask "what does this widget need?" — and prevented boot validation
from catching a widget wired to a path holding the wrong shape.

Output ports existed briefly and were removed (team-tiger decision, see
doc/widget-events-design.md): a write from widget code is unenforceable
and invisible. A widget now only READS through ports; every state change
it causes is an emitted event plus a reaction declared in the view model.

## Contract

Every `WidgetDefinition` declares its input ports:

```ts
/** One store-binding port of a widget. */
interface PortDefinition<T = unknown> {
  description?: string;
  /** Validator for the VALUE at the bound store path (zod-compatible). */
  value: Validator<T>;
  /** Whether the port must be bound. Default: true. */
  required?: boolean;
  /** What the widget shows while the bound path holds nothing. */
  default?: T;
}

interface WidgetIO {
  /** Store values the widget READS (subscribes to). */
  inputs: Record<string, PortDefinition>;
}
```

A port describes the VALUE, not the path: `antd-counter`'s `value` port is
`z.number()` — whatever path it is bound to must hold a number.

Widgets receive a `ReadableStore` (`get` / `subscribe` / `snapshot`) — not a
type cast, a view without `set` — so a widget cannot write even by accident.

## Binding convention

The view model binds port names to store paths under the reserved `inputs`
key, and event names to reactions under the reserved `on` key:

```ts
{
  inputs: { <portName>: "<store path>" },        // e.g. { value: "demo.counter" }
  on:     { <event>: [{ set: "<store path>", from?: "<payload field>" }] },
  ...widgetSpecificSettings
}
```

`widgetBindingsSchema(io, events)` builds this part of the VM schema FROM
the declarations, so the two can never drift: required ports are required
path strings, optional ports optional, unknown port or event names are
rejected (strict), and empty sections default to `{}` so port-less widgets
need no boilerplate. The TYPES follow too: `viewModel.inputs.value` is a
`string`, an optional port `string | undefined`, and a misspelled port name
does not compile.

```ts
const io = { inputs: { value: { value: z.number() } } } satisfies WidgetIO;
const events = {
  incremented: { payload: z.object({ value: z.number() }), required: true },
} satisfies WidgetEvents;

const viewModel = widgetBindingsSchema(io, events).extend({
  step: z.number().default(1),
  label: z.string().default("Increment"),
});
```

## Validation

- **Registration**: a definition without a well-formed `io` (`{ inputs }`)
  or `events` is rejected, and so is a port without a `value` validator or
  with a `default` its own validator rejects.
- **Resolve/boot**: after the VM parses, every required port must be bound
  to a path, every REQUIRED event must have at least one reaction, every
  `call` must name a registered action and every `from` must start at a
  field the payload has — otherwise the cell renders a problem placeholder
  and validation reports it (same shared logic, `contractProblems`, they
  cannot disagree). Boot validation checks EVERY template of a cell's model,
  not only the one shown: a user may select any of them.
- **Empty paths**: a port declares `default` — what the widget shows while
  the bound path holds nothing (counter 0, input "", table no rows); the
  builder prints it next to the port. A port WITHOUT a default renders an
  explicit empty state (echo shows ∅, label falls back to its `text`).
  The alternative — an adapter-level "no data" placeholder — was rejected:
  emptiness is widget-specific.
- **Value typing**: `PortDefinition.value` is the contract for tooling (the
  builder's autocomplete offers only compatible existing paths) AND for
  reads: `usePort(store, path, port)` (`@wirework/react`) returns the value
  validated by the port — a malformed value gives the port's default, once
  per stored value, never per render. Data is live, so widgets must never
  crash on it. A widget that deliberately SHOWS whatever is there (echo, a
  text input) reads `useStorePath` instead.

## Builder flow (playground)

1. The palette (`WidgetPreview` in `@wirework/react`: every widget rendered
   live, from its `preview` seed, in an isolated sandbox) shows every
   registered widget; selecting one reads `definition.io`,
   `definition.events` and the settings off `definition.viewModel`.
2. The form renders one path field per input port (autocomplete), one
   reaction per event (path to set + payload field; mandatory when the
   event is `required`), and one field per primitive setting.
3. "Add widget" writes a template `{ inputs, on?, ...settings }` under
   `widgets.custom.<id>` plus a cell appended to the builder page.
   Resolution and validation treat it exactly like a fixture one.

## Builder settings

Bindings are not the whole view model: a widget's own settings (`text`,
`step`, `columns`, …) live beside `inputs` / `on`. `settingFields(
definition.viewModel)` reads the PRIMITIVE top-level settings (string /
number / boolean, through `.optional()`, `.default()` and `.describe()`)
off the zod validator:

- required (no default, not optional) → the field gates "Add",
- defaulted → shown as placeholder, blank means "use the default",
- a zod enum → a select of its values (plus "default: …" when defaulted),
- non-primitive (arrays, objects) → left to defaults; edit in the inspector.

## Contracts

Label, button, input, pagination, refresher, select, multi-select, tag,
checkbox, progress, alert and table implement the standard CONTRACTS
(doc/widget-contracts-design.md): their ports, events and settings are
declared once in `@wirework/widget-contracts` and reused by every
implementation.

## Examples

| widget            | inputs                       | events (reaction required?)     |
| ----------------- | ---------------------------- | ------------------------------- |
| antd-counter     | `value: number`              | `incremented { value }` — YES   |
| antd-table       | `rows: object[]`, `loading?: boolean` | `row-selected { key, row }` — no |
| antd-echo        | `value: unknown`             | —                               |
| antd-label       | `text?: string` (optional)   | —                               |
| antd-crash       | —                            | —                               |
