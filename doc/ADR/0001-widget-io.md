# ADR-0001: Widget IO — typed inputs; writes are events

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

A widget declares typed INPUT ports only. Each port validates the VALUE at
the bound store path and may declare a `default` for a path that holds
nothing. The view model binds ports to paths under `inputs`; that part of
its schema is built FROM the declarations. A widget never writes: every
state change it causes is an emitted event plus a reaction declared in the
view model. All of it is built.

## 2. Problem

Widgets bind to the store through paths in their view model. Without a
machine-readable declaration, nothing says which fields are bindings or what
TYPE of value a bound path must hold. A builder cannot ask "what does this
widget need?", and boot validation cannot catch a widget wired to a path
holding the wrong shape.

This record says how a widget declares what it reads, how a view model binds
those declarations to paths, and how a widget changes state.

## 3. Details

### Contract

Every `WidgetDefinition` declares its input ports. A port describes the
VALUE at the bound path, not the path: `antd-counter`'s `value` port is
`z.number()` — whatever path it is bound to must hold a number.

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

A widget receives a `ReadableStore` (`get` / `subscribe` / `snapshot`) — a
view without `set`, not a type cast — so it cannot write even by accident.
Every state change it causes is an emitted event plus a reaction
(doc/ADR/0002-widget-events.md).

### Binding convention

The view model has three reserved keys beside the widget's own settings:
`inputs` binds port names to store paths, `on` binds event names to
reactions, `when` says when the widget shows (doc/ADR/0008-conditions.md).

```ts
{
  inputs: { <portName>: "<store path>" },        // e.g. { value: "demo.counter" }
  on:     { <event>: [{ set: "<store path>", from?: "<payload field>" }] },
  when?:  [{ path: "<store path>", is: "<predicate>", to?: <literal>, not?: true }],
  ...widgetSpecificSettings
}
```

`widgetBindingsSchema(io, events)` builds this part of the schema FROM the
declarations, so the two cannot drift:

- a required port is a required path string, an optional port optional;
- unknown port or event names are rejected (strict);
- empty sections default to `{}`, so a port-less widget needs no boilerplate;
- the TYPES follow: `viewModel.inputs.value` is a `string`, an optional port
  `string | undefined`, and a misspelled port name does not compile.

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

### Validation

- **Registration** rejects a definition without a well-formed `io`
  (`{ inputs }`) or `events`, a port without a `value` validator, and a
  port whose `default` its own validator rejects.
- **Resolve and boot.** After the view model parses: every required port
  must be bound, every REQUIRED event must have at least one reaction, every
  `call` must name a registered action, every `from` must start at a field
  the payload has. Otherwise the cell renders a problem placeholder and
  validation reports it. Both use `contractProblems`, so they cannot
  disagree. Boot validation checks EVERY template of a cell's model, not
  only the one shown: a user may select any of them.
- **Empty paths.** A port's `default` is what the widget shows while the
  bound path holds nothing (counter 0, input "", table no rows); the builder
  prints it next to the port. A port WITHOUT a default renders an explicit
  empty state (echo shows ∅, label falls back to its `text`).
- **Value typing.** `PortDefinition.value` is the contract for tooling —
  the builder's autocomplete offers only compatible existing paths — and for
  reads: `usePort(store, path, port)` (`@wirework/react`) returns the value
  validated by the port. A malformed value gives the port's default,
  checked once per stored value, never per render. Data is live, so a widget
  must never crash on it. A widget that deliberately SHOWS whatever is there
  (echo, a text input) reads `useStorePath` instead.

### The builder reads the contract

1. The palette (`WidgetPreview` in `@wirework/react`) renders every
   registered widget live, from its `preview` seed, in an isolated sandbox.
   Selecting one reads `definition.io`, `definition.events` and the settings
   off `definition.viewModel`.
2. The form renders one path field per input port (autocomplete), one
   reaction per event (path to set and payload field; mandatory when the
   event is `required`), and one field per primitive setting.
3. "Add widget" writes a template `{ inputs, on?, ...settings }` under
   `widgets.custom.<id>` and appends a cell to the page. Resolution and
   validation treat it exactly like a fixture one.

`settingFields(definition.viewModel)` reads the PRIMITIVE top-level settings
(string / number / boolean, through `.optional()`, `.default()` and
`.describe()`) off the zod validator:

- required (no default, not optional) → the field gates "Add";
- defaulted → shown as placeholder, blank means "use the default";
- a zod enum → a select of its values (plus "default: …" when defaulted);
- non-primitive (arrays, objects) → left to defaults; edited in the
  inspector.

### Standard contracts

The standard widgets take their ports, events and settings from
`@wirework/widget-contracts`, declared once and reused by every
implementation (doc/ADR/0004-widget-contracts.md).

### Examples

| widget       | inputs                                | events (reaction required?)      |
| ------------ | ------------------------------------- | -------------------------------- |
| antd-counter | `value: number`                       | `incremented { value }` — YES    |
| antd-table   | `rows: object[]`, `loading?: boolean` | `row-selected { key, row }` — no |
| antd-echo    | `value: unknown`                      | —                                |
| antd-label   | `text?: string` (optional)            | —                                |
| antd-crash   | —                                     | —                                |

## 4. Options weighed

| Option                                          | Verdict                                                                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paths in the view model, no declaration         | Dropped. Costs nothing to write, but nothing says which fields are bindings or what a path must hold — it blocks the builder and boot validation.                          |
| Input ports and output ports                    | Dropped. An output port is declarative only: the write itself is an unchecked `store.set` inside widget code, unenforceable and invisible (doc/ADR/0002-widget-events.md). |
| Typed input ports only; every write is an event | Chosen. Costs a reaction per state change (a default for controlled widgets, doc/ADR/0002-widget-events.md) and gives a write that is declared, validated and visible.     |

For a bound path that holds nothing, an adapter-level "no data" placeholder
for every widget was weighed against a `default` the port declares. The
placeholder was dropped: emptiness is widget-specific.
