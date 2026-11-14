# ADR-0008: Conditions — a widget shown when a predicate holds

- **Status:** Accepted — built
- **Date:** 2026-11-01
- **Deciders:** the tiger team (doc/team_tiger.md)

## Motivation

A page cannot say "show this only when…". The run page keeps an error
label on screen with an empty text until the server says there is no such
run; the runs page shows "Open run" before any run is selected; nothing
can hide a Retry button from a user who may not retry, or show a "No
results" notice when a list is empty. Every widget decides its own
emptiness (a label with no text, a tag with no value), and that is the
only conditional behaviour a page has — not configurable, and useless for
a button, a table or an input.

The ask: conditional rendering from configuration, with a set of
predefined checks — equal, contains for text, true/false for booleans,
greater and less for numbers — and a way for an application to add and
register checks of its own.

Designed 2026-11-01 with the tiger team and built the same day. Status:
**built** (see "Built and tested" at the end; story WW-25 in
doc/product-stories.md).

## The tiger team's positions

- **Morgan (product):** three things a page builder asks for every week:
  hide a control from users who may not use it, show an error or a
  "nothing here" line only when there is something to say, and show the
  details of a record only once it has loaded. All three are "show this
  widget when a value is …". Ship that; nothing else in this story. A
  builder must be able to set it from the form in words — "show when
  `run.error` is not empty" — without touching JSON.
- **Ren (contrarian):** the team drew a line twice — "reactions never
  transform" and "no conditionals or formats ever enter a cell's
  configuration" — and this is a conditional in configuration. Either the
  line moves and we say so, or we refuse. Ren's position after the
  debate: the line was against EXPRESSIONS (arithmetic, two paths
  compared, nested logic nobody can validate), not against a closed set of
  named comparisons the engine owns. So: one path, one named check, one
  literal; AND of ORs and nothing deeper; no comparison of two paths — a
  value that needs computing is computed by an action into the store
  ("derive in code, test in configuration"); and the first thing to build
  is the REGISTRY, because the moment a check is missing somebody will
  propose an expression language, and the answer must already be "write a
  predicate with a name". Also: a hidden widget leaves a hole in a grid —
  accepted, say it in the doc, and do not start reflowing layouts on store
  changes.
- **Dmitri (readability):** `{ path, is, to }` reads as a sentence and so
  must the list: a list of tests is AND, `{ any: [...] }` inside it is OR,
  one level, no `all` key (the list already is one), no `not` block — a
  `not: true` flag on a test, shown as "unless" in words. Comparisons must
  have ONE rule each, written in the predicate's description: `equal`,
  `one-of` and `contains` compare the value AS TEXT, exactly as the tag
  cell's tones already do (the settings page stores a page size as the
  text "5"; a page builder must not have to know that); `greater` and
  `less` take the value as a number when it is one, or text that is a
  number, and do not hold otherwise. No regex predicate in the standard
  set: a host that wants one registers one.
- **Alexei (architecture):** the condition is WIRING, so it lives beside
  `inputs` and `on` in the widget's view model under a third reserved key,
  `when`: derived into every view-model schema by `widgetBindingsSchema`,
  refused as a setting name by `defineContract`, refused in the user
  overlay like the other two, checked by the same `checkTemplate` resolve
  and boot validation run, read by the builder like the other two. Not on
  the layout cell: a cell belongs to its engine, a user's own template is a
  copy of the layout, and a condition in a layout would be shared by
  Share/Import. Predicates are the fifth `NamedRegistry` — the extension
  point the keep-it-simple review withdrew "until a host wants one": a
  host wants one. Evaluation is a pure function in the engine,
  `holds(when, read, predicates)`, so the React adapter only subscribes and
  the same function can later test a row (`read` = the row's property)
  for row actions (WW-17).
- **Katya (team lead):** the standard checks are BUILT IN to
  `createPredicates()` — a host cannot forget to register `equal` and
  break every page; a host adds its own, namespaced like actions
  (`runs/retryable`). The builder's first version offers AND rows only
  (path, check, value, "unless"); `any` is written in the inspector until
  somebody asks for it in the form. Everything the user sees is one
  function's sentence (`whenText`): the form's summary, the edit-mode note
  on a hidden cell, the problem messages — one wording, no drift.
- **Sasha (QA):** a hidden cell must be a FACT on the page: the cell
  element stays, with `data-when="false"`, its content gone, so a scenario
  says `the cell "button-open-run" is hidden` and then `is shown` after a
  click. In edit mode the widget must stay visible (dimmed, with the note),
  or a tester cannot find it to edit. Every built-in predicate gets a table
  test over the awkward values (undefined, null, "", 0, false, "5" against
  5, NaN, an object); a story shows a cell appearing on a store write; the
  Gherkin steps read as sentences: "When I show the widget only when
  "runs.total" is greater than "10"". A host predicate that throws must be
  isolated and reported like a crashing widget, never take the page down.
- **Vlad (fluency):** `holds` is one `every` over `some`; the paths a
  condition reads are one `flatMap`; the adapter's hook is one
  `useSyncExternalStore` whose snapshot is the boolean itself; the built-in
  predicates are one table of `{ name, phrase, argument?, test }`.

Decision: build the above. Rejected: an expression language over VALUES
(arithmetic, `{ "$gt": … }` operator trees, two paths compared);
conditions on the layout cell; `all`/`not` blocks in the JSON; reflowing
the layout around a hidden cell; a regex predicate in the standard set;
`when` on reactions (a conditional reaction is the first step of a
workflow engine — an action decides what it does). Added after the build,
at the product owner's ask: the CONSTRUCTOR ("The constructor" below) —
boolean composition of the same named checks, in words, with `and`, `or`,
`not` and parentheses. It moves Ren's line exactly as far as Ren drew it:
no expression over values, only over checks.

## The shape

Beside `inputs` and `on`, a widget's view model may carry `when`: a list
of tests that must ALL hold for the widget to show. A test reads one store
path and names one predicate, with the literal the predicate takes; a test
may be negated; a member of the list may be `{ any: [tests] }`, which holds
when ONE of its tests does. That is the whole grammar.

```ts
// run page: the error line shows only once there is an error
error: { default: { inputs: { text: "run.error" }, tone: "danger",
  when: [{ path: "run.error", is: "empty", not: true }] } }

// runs page: "Open run" shows only while a run is selected
openRun: { default: { label: "Open run", on: { clicked: [{ call: "runs/open-selected" }] },
  when: [{ path: "runs.selected", is: "empty", not: true }] } }

// a Retry button for admins and owners, on a failed or stuck run
retry: { default: { label: "Retry", on: { clicked: [{ call: "runs/retry" }] },
  when: [
    { path: "app.permissions.role", is: "one-of", to: ["admin", "owner"] },
    { any: [
      { path: "run.data.status.state", is: "equal", to: "Failed" },
      { path: "run.data.status.state", is: "equal", to: "Running" },
    ] },
  ] } }

// a check the application wrote: two properties and a rule, code with a name
retry: { default: { label: "Retry", when: [{ path: "run.data", is: "runs/retryable" }] } }
```

```ts
// @wirework/schema, contracts/when.ts
const testSchema = z
  .object({
    path: storePathSchema, // a DATA path: never a configuration tree
    is: z.string().regex(PREDICATE_NAME), // "empty", "equal", "runs/retryable" (the action grammar)
    to: z.unknown().optional(), // the literal the predicate takes; checked by the predicate
    not: z.boolean().optional(), // "unless"
  })
  .strict();
export const whenSchema = z.array(z.union([testSchema, z.object({ any: z.array(testSchema).min(1) }).strict()])).min(1);
export type When = z.infer<typeof whenSchema>;
```

- `RESERVED_VIEW_MODEL_KEYS` becomes `inputs`, `on`, `when`:
  `widgetBindingsSchema` adds `when: whenSchema.optional()`,
  `defineContract` refuses a setting named `when`, the user overlay's
  settings may not carry it (a user's view cannot hide what the page
  shows — a user removes the cell from their own view instead), and
  `WidgetBindings` gains `when?: When`.
- An empty list is refused (`min(1)`): "show when nothing" is a mistake,
  not "always". `to` beside a predicate that takes none, or missing for
  one that takes it, is a cell problem, not a silent default.
- No `when` means what it means today: the widget always shows.

### The constructor

A third kind of member, for what AND of ORs cannot say and a page builder
would rather write than click: the condition in WORDS.

```ts
when: [{ expression: 'run.error is empty or (run.state equals "Failed" and not run.data can be retried)' }];
```

```
expression := or
or         := and ("or" and)*
and        := unary ("and" unary)*
unary      := "not" unary | "(" expression ")" | test
test       := PATH PHRASE [literal ("," literal)*]
literal    := "text" | number | true | false
```

The leaves are the same tests: a store path, a registered predicate by
its PHRASE ("is greater than", a host's "can be retried" — matched word
for word, the longest phrase first), and the literal it takes (several,
comma-separated, for a list check). Only `and`, `or`, `not` and the
parentheses are new; `and` binds tighter than `or`. The engine parses it
once per registry and text (`parsedExpression`, `expressions.ts`) into a
tree of `all` / `any` / `unless` over tests; `holds` walks it, `whenPaths`
reads its leaves, `whenText` echoes the words, `whenProblems` reports a
text that cannot be read as a sentence a page builder can act on —
`when[0] cannot be read: expected a value after "is greater than"`,
`missing ")"`, `expected a check after "run.error" (checks: …)` — and
then every leaf's problems as for a plain test. A constructor that cannot
be read never holds.

In the builder it is the check list's last entry, "constructor — build the
condition step by step", and the row becomes a TREE read left to right as
the condition it builds, not a text field: `not ( a and b ) or ( c and d )`.
A part is a test (the same fields as a row: when/unless, path, check,
value) or a nested group between "(" and ")" on a purple band; the word
between two parts is a teal button that switches the group's joiner
between "and" and "or"; "not" before a group is a button, volcano when
pressed; after the last part the joiner once more ("and …") adds a test
and "( … )" adds a group inside; × removes a part or a group. Every kind
of element has its own colour and the controls are larger than the rest
of the form, so a built condition is read at a glance (the designer's
pass; `styles.css` names the roles). The form prints the tree to the words above after every step and
shows them as the sentence — or "finish every condition" while a test is
blank, or the test's own problem — and Add waits. What is saved is the words; the
editor parses them back into the tree (`draftsOfWhen` with the registry),
so a condition built here is built on later. Words the form cannot read
(hand-written in the inspector and broken) stay as they are, with the
problem, and are not saved over. The headless state is `GroupDraft` /
`TestDraft`, one callback `editConstructor(index, at, edit)` with `at` the
part's place ("", "1", "1.0") and `TreeEdit` the step (`set`, `group`,
`add`, `"remove"`), and `editTree` the pure function behind it.

### Appearance

A widget with a condition may say how it APPEARS when the condition turns
true and how it DISAPPEARS when it turns false: `appear` and `disappear`,
the fourth and fifth reserved keys beside `inputs`, `on` and `when`, each
the NAME of an animation — never a duration or a curve in configuration.

The names are a registry, the sixth extension point, built like the
predicates': `createAppearances()` in the engine starts with the standard
five (`standardAppearances` in the schema: `fade`, `slide-up`,
`slide-down`, `zoom`, `flip`, each with a description for the builder's
list) and takes the host's own — a kebab-case name and a description —
until it is sealed; `STANDARD_APPEARANCES` is the standard set alone, what
every function uses when no registry is given. A name nobody registered
is a contract problem (`appearanceProblems`, part of `contractProblems`
given `ResolveInput.appearances`), reported by resolve and boot validation
like an unknown predicate.

The adapter draws a name as the CSS keyframes `ww-<name>`: the element
around the widget (`.ww-appear`, 320 ms, eased) plays them FORWARD when it
mounts with the condition and in REVERSE (`.ww-disappear`,
`animation-direction: reverse`) on its way out — one set of keyframes
serves both directions, and a host registers an appearance of its own by
naming it and writing `@keyframes ww-<name>` in a stylesheet of its own
(the playground's `drop`: `appearances.register({ name: "drop",
description })` in `demo/install.ts`, `ww-drop` in `index.css`). On the
way out the widget stays MOUNTED until `animationend`, then leaves
(`useShowing`); shown again before that,
it stays and plays its appearance. Under `prefers-reduced-motion` the
stylesheet plays nothing, so the hook unmounts at once rather than wait
for an end that would never come. The cell carries `data-appear` and
`data-disappear`.

The builder offers both under the conditions, as "appears with" and
"disappears with", from the registry's names, only while there is a
condition; `collect()` saves them only with one and only when the
registry knows the name, because an animation means nothing without a
condition to play on. Without them a widget simply shows and goes.

## The predicates

```ts
// @wirework/schema
export interface PredicateDefinition<A = unknown> {
  /** "equal", "runs/retryable" — the action grammar: kebab-case, one optional namespace. */
  name: string;
  /** The test as a sentence, shown by builders: "the value, as text, equals the given text". */
  description: string;
  /** How a test READS: "<path> <phrase> <to>" — "equals", "is greater than", "can be retried". */
  phrase: string;
  /** What `to` must be; absent: the test takes no `to` (empty, true, false). */
  argument?: Validator<A>;
  /** PURE and synchronous: a function of the value and the literal — no store, no bus, no clock, no throw. */
  test: (value: unknown, to: A) => boolean;
}
```

The standard set, built into every registry (`standardPredicates`,
declared in `@wirework/schema` beside the grammar like the page events,
because its arguments are zod and the engine has no runtime zod), each with
its one rule:

| name       | `to`                      | holds when                                                                                                      |
| ---------- | ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `empty`    | —                         | the value is undefined, null, `""`, `[]` or `{}` — "nothing to show", the emptiness `useBoundText` already uses |
| `true`     | —                         | the value is exactly `true` (a missing value is neither true nor false: `not true` holds, `false` does not)     |
| `false`    | —                         | the value is exactly `false`                                                                                    |
| `equal`    | string \| number \| bool  | the value AS TEXT (`valueText`) equals `to` as text — `5` equals `"5"`, like the tag cell's tones               |
| `one-of`   | a non-empty list of those | the value as text equals one of `to` as text                                                                    |
| `contains` | non-empty string          | the value as text contains `to` (case-sensitive; an object or list is its JSON, like `valueText`)               |
| `greater`  | number                    | the value is a finite number, or text that is one (`"5"`, not `""`, not a boolean), and is greater than `to`    |
| `less`     | number                    | same reading of the value, less than `to`                                                                       |

Negation is on the test (`not: true`): "unless". `at-least` is `not less`,
"is set" is `not empty`; the set stays at eight so the form's dropdown
reads in one glance. A regex check, case-insensitive text, dates and
durations are host predicates: the host knows its data.

### Registering the application's own

```ts
// @wirework/engine
export type PredicateRegistry = NamedRegistry<PredicateDefinition>;
/** A registry with the standard predicates already in it; the host adds its own before sealing. */
export function createPredicates(): PredicateRegistry;
```

The fifth extension point, in the host's `boot.ts` next to contracts,
widgets, layout engines and actions — created, filled, sealed:

```ts
// apps/playground/src/demo/install.ts
predicates.register({
  name: "runs/retryable",
  description: "A failed run the fake server would accept again (its id is even)",
  phrase: "can be retried",
  test: (run) => isRetryable(run), // a failed run with an even id
});
```

Invariants, checked at registration like every registry's: the name
matches `PREDICATE_NAME` (the action grammar), `test` is a function,
`phrase` and `description` are non-empty, `argument` when given has
`parse`. A standard name cannot be registered again (the usual "already
registered"); the standard set is the vocabulary of the grammar, like the
two reaction verbs — not a list the host might forget. Registries are
sealed after boot, so a predicate is never added under a running page.
`STANDARD_PREDICATES` is the standard set alone, sealed: what every
function below evaluates against when no registry is given, so a host
that never registers a predicate of its own passes nothing.

The line Ren drew for input validators holds here and is the same line:
a predicate is a pure function of the value and the literal. Anything
that needs the store, the bus, the clock or a request is an ACTION that
writes a value the condition then reads (`runs.canRetry`, computed when
the run loads). A two-path comparison is the same case. The validator
registry the input design promised ("custom rule from code", not built)
is this registry: a validator is a predicate on the input's value — a
follow-up, not this story.

## Evaluation and rendering

```ts
// @wirework/engine, predicates.ts — pure; `predicates` defaults to STANDARD_PREDICATES
export function holds(when: When | undefined, read: (path: string) => unknown, predicates?: PredicateRegistry): boolean;
export function whenPaths(when: When | undefined): readonly string[]; // what it reads — what to subscribe to
export function testText(test: WhenTest, predicates?: PredicateRegistry): string; // 'when run.state equals "Failed"', "unless run.error is empty"
export function whenText(when: When, predicates?: PredicateRegistry): string; // the tests joined: 'unless run.error is empty, when app.role is one of "admin", "owner"'
export function whenProblems(when: When | undefined, predicates?: PredicateRegistry): string | undefined;
```

`holds` is `when.every(member => "any" in member ? member.any.some(test) : test(member))`
with `test = ({ path, is, to, not }) => predicates.get(is).test(read(path), to) !== (not === true)`.
An unknown predicate at runtime does not hold (boot and resolve reported
it already). `read` is injected: a cell reads the store (`store.get`); a
row action (WW-17) will read the row.

The adapter (`@wirework/react`) evaluates it where the cell renders, not
in the plan: the plan is memoized on configuration and a condition is a
runtime fact. `useWhen(store, when, { predicates, onError })` is one
`useSyncExternalStore` subscribed to `whenPaths(when)` whose snapshot is
the answer itself — shown, hidden, or the message of a predicate that
threw. `CellView` renders:

- **shown** — as today, the cell element carrying `data-when="true"`
  (absent when the template has no `when`);
- **hidden, view mode** — the cell element stays in the layout with
  `data-when="false"` and nothing inside it: the engine's slot keeps its
  place (a grid item becomes a blank area; a flex-rows slot keeps its
  width), the widget is UNMOUNTED. The hole is the page builder's to
  place: a conditional widget sits where a blank is fine (the run page's
  error line under the details). No engine reflows: a layout that moved on
  every store change would be unusable, and the edit-mode placement must
  stay where the user put it.
- **hidden, edit mode** — the widget renders anyway, dimmed
  (`ww-cell-hidden-now`), with a note above it (`cell-hidden-note`):
  "hidden now — shows unless run.error is empty" (`whenText`). A tester,
  and a page builder, can see and edit what the page would hide.

Consequences, stated: an unmounted widget reads nothing and emits nothing;
its state is in the store, so it comes back as it was; a table that
appears when its condition turns true fires `load` and requests its rows,
exactly as an added table does — a condition that flips often is a
request each time, which is the page builder's choice. The cell's
REACTIONS stay bound whether it shows or not (`bindReactions` binds the
plan): nothing emits from a hidden cell, so nothing runs. A host predicate
that throws is a crash of the cell: the hook catches it, the cell shows
the same placeholder a crashing widget gets (`WidgetCrash`) and reports it
through `PageView.onError` — the page stands, and the cell recovers when
the value changes. The palette preview ignores `when`.

## Validation

`checkTemplate` parses `when` with the rest of the view model (the schema
refuses a configuration path, a malformed name, an empty list, an unknown
key) and `contractProblems` adds `whenProblems` — given the predicate
registry the way it is given the action registry (`ResolveInput.predicates`),
so resolve and boot validation say the same thing, in the same sentences
as the reactions' problems:

- `the condition is wrong: when[1] uses an unknown predicate "equals" (registered: empty, true, false, equal, one-of, contains, greater, less, runs/retryable)`
- `the condition is wrong: when[0] gives "greater" a value it refuses: (root): Expected number, received string`
- `the condition is wrong: when[2] gives "empty" a value, and it takes none`
- `the condition is wrong: when[0].any[0] gives "equal" no value, and it takes one`

A broken `when` is an `unmet-contract` cell problem: the placeholder names
it, the page renders. Nothing checks the TYPE at the path against the
predicate (the store is live data); the builder's autocomplete offers the
existing data paths (`compatibleStorePaths` with an accept-all validator)
and the page shows the result.

## Builder

A "Show when" section in the widget form, under the reactions, built the
way the reactions are:

- rows added with "+ condition" and removed with ×; each row a "when /
  unless" select for `not`, a path (combobox over the existing data paths),
  a check (select: the standard phrases, then the host's with its
  namespace — "can be retried (runs)"), and a value field whose kind
  follows the predicate's `argument` (`argumentKind` in `@wirework/schema`:
  text, a number typed as text so "ten" can be told off as "not a number",
  a list as comma-separated text, a yes/no or an enum as a select, JSON;
  nothing for `empty`/`true`/`false`);
- the row's sentence under it, from `testText`, so the user reads what
  they wrote: "unless run.error is empty" — or, in its place, why the
  value cannot be used ("not a number", what the predicate refused);
- a row with a path and a check is a condition; a blank row is dropped
  by `collect()`; a row with only one of the two, or a value the predicate
  refuses, gates Add, like an action's parameter;
- `any` is not offered by the first form: the inspector writes it, the
  form shows such a template's `any` members read-only ("one of —
  written in the inspector") and keeps them on save;
- the editor prefills it from the resolved view model
  (`valuesFromViewModel`); on the user overlay target the section is
  read-only like ports and reactions (wiring is the page's), and a save
  there carries no `when` (settings only).

Ids follow the reactions' pattern (`@wirework/antd-builder/ids`,
`conditionFieldId(part, index)`): `condition-path`, `condition-is`,
`condition-to`, `condition-not`, `condition-sentence`, `condition-problem`,
`condition-remove` for the first row, `condition-2-path`, … for the next,
`condition-add` for the section; rows carry
`[data-testid="widget-condition"][data-index]`, the section
`widget-conditions` and, while empty, `widget-conditions-always`. Headless
state in `@wirework/builder` (`form-when.ts`: `ConditionDraft`,
`ConditionField` with what each row `saves`, `literalOf`,
`predicateChoices`, `whenOfConditions`, `draftsOfWhen`), the hook's
`conditions`, `predicateChoices`,
`conditionPaths`, `addCondition`, `removeCondition`, `setCondition(index,
field, value)`; `collect()` returns `when` in the bindings and
`templateOf(bindings, settings)` writes it into a template.

## Demo and scenarios

- Runs page: "Open run" shows only while `runs.selected` is not empty.
  The selected-run echo stays: its "∅" is how two scenarios prove a click
  did NOT select the row. Run page: the error line shows only when
  `run.error` is not empty; a "Retry possible" tag (`tag-run-retry`) is
  shown by the host predicate `runs/retryable`; the status, reference and
  message cells keep today's "…" placeholders while the run loads (the
  product owner's open question, decided for the fixture: nothing moves
  on the page while it loads).
- Steps: `the cell "<id>" is hidden` / `is shown` (`data-when`), `the
cell "<id>" always shows` (no `data-when`), `the cell "<id>" says it is
hidden now "<condition>"` (edit mode), `the cell "<id>" shows the problem
"<text>"`; in the builder `I add a condition`, `I set the condition to
"<path>" "<phrase>" "<value>"` (and without a value; `condition <n>` for
  the next rows — the phrase picks the check: "is empty", "equals", "is
  one of", "contains", "is greater than", "is less than", "is true", "is
  false", a host's "can be retried"), `I negate condition <n>`, `I remove
condition <n>`, `the condition reads "<sentence>"`, `the condition
problem is "<text>"`.
- Stories: `WidgetBuilder` — `ShowsWhen` (a condition typed, the problem,
  the sentence, what Add hands over). The cell states are jsdom tests of
  `PageView` (hidden in view mode, dimmed with the note in edit mode, an
  unknown predicate as a cell problem, a predicate that throws isolated
  and reported) and `useWhen`.
- Unit: a table test per built-in over `[undefined, null, "", "5", 5, 0,
false, true, NaN, [], {}, { a: 1 }, "Failed"]`; `holds` over AND, `any`,
  `not`, an unknown name; `whenText`; `whenProblems` sentences; registry
  invariants; schema refusals (configuration path, empty list, an unknown
  key, nested `any`); the form's `literalOf`, `conditionFieldOf`,
  `whenOfConditions` / `draftsOfWhen`, `predicateChoices`; the builder hook's
  gating and what it saves.

## Packages

- `@wirework/schema`: `contracts/when.ts` (`whenSchema`, `When`,
  `WhenTest`, `WhenAny`, `PredicateDefinition`, `standardPredicates`),
  `PREDICATE_NAME` in `names.ts`, `valueText` in `paths.ts` (the one text
  of a value — `cellText` in the contracts is it), `argumentKind` in
  `settings.ts`, `RESERVED_VIEW_MODEL_KEYS`, `widgetBindingsSchema`,
  `WidgetBindings`, the overlay's settings rule.
- `@wirework/engine`: `predicates.ts` (`createPredicates`,
  `STANDARD_PREDICATES`, `holds`, `whenPaths`, `testText`, `whenText`,
  `whenProblems`), `ResolveInput.predicates`, `checkTemplate` and
  `contractProblems` taking `{ actions, predicates }`, exports.
- `@wirework/react`: `useWhen.ts`, `CellView` (the three states, the
  note), `WidgetCrash` (the one crash placeholder), `PageView` /
  `usePagePlan` / `usePageRenderers` take `predicates`, `styles.css`.
- `@wirework/builder`: `form-when.ts`, the form hook, `templateOf` in
  `form-drafts.ts`, `predicates` on the form, builder, editor and
  page-editing hooks; `@wirework/antd-builder`: the "Show when" section,
  `conditionFieldId`, `predicates` on `WidgetBuilder` and `WidgetEditor`.
- `apps/playground`: `Registries.predicates`, `runs/retryable`,
  `usePlayground` hands the registry to validation, the plan, `PageView`,
  the builder and the editor; `@wirework/view-data-models-examples`: the
  conditions above and the `tag-run-retry` cell.
- `e2e`: steps in `layout.steps.ts` (the cell states) and
  `builder.steps.ts` (the rows), `conditions.feature`, `app.feature`'s
  "Nothing opens while no run is selected" (the button is not even shown),
  and "keeps inputs and reactions read-only" checks the condition's Add
  too.

## Phases

| Phase | Work                                                                                                                                                                                                                      | Estimate   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1     | Schema (`when`, the reserved key, the overlay rule), the predicate registry with the standard eight, `holds` / `whenPaths` / `whenText` / `whenProblems`, resolve and boot validation, unit tests                         | 1 day      |
| 2     | Adapter: `useWhen`, the three cell states, the error isolation, `predicates` through `PageView`; the host registry and `runs/retryable`; the demo's conditions; `conditions.feature`, the affected scenarios, the stories | 1 day      |
| 3     | Builder: the "Show when" rows (AND only, `any` read-only), argument kinds, gating, the editor prefill, the overlay read-only, ids, steps, scenarios and stories                                                           | 1–1.5 days |

## Follow-ups (not in this story)

- `any` rows in the form, when a page builder asks for an OR in words.
- Row actions (WW-17): `enabled: When` on a row action, `holds` with
  `read` = the row's property — the same grammar, the same registry, the
  reason the button is disabled from `whenText`.
- Input validation from code: the custom validators the input design
  left unbuilt are predicates on the input's value.
- A "No results" notice built from conditions (`runs.total` equals 0)
  covers part of WW-18 without a widget change.
- A user's own "hide for me when…" in the overlay — only if asked; it
  would be a second `when`, ANDed, never a way to show what the page
  hides.

Open to the product owner: whether a hidden widget should also be
hideable by the USER (the overlay question above). The demo's run page
keeps its "…" placeholders while the run loads (decided for the fixture;
a page builder hides them with one `when` per cell).

## Reviewed 2026-11-02 (the constructor as an editor, the appearance, the six widgets)

- **Morgan:** the constructor is now something a page builder COMPOSES —
  the condition reads left to right as it will run, every element in its
  own colour. The "and …" button says what adding does. Ship.
- **Dmitri:** the saved form is still the words, and the tree is only the
  form's; nothing new in the engine. `Appearing` renders no element when
  there is nothing to appear with: an extra `div` around every widget on
  every page would have been the kind of cost nobody notices until a
  stylesheet does.
- **Alexei:** `appear` is a binding like `when`, derived into the schema,
  refused as a setting, kept out of the overlay — the same seam, no new
  one. The six kinds follow the contract pattern to the letter: a contract,
  an implementation with its hook, a conformance set another
  implementation runs.
- **Sasha:** the e2e helper that picks from an antd Select now goes by the
  keyboard (Down until the highlighted option is the one wanted, Enter):
  the mouse path lost a race with antd's popup alignment on long forms,
  three times, with the trace to prove it. The new widgets are driven by
  role (`switch`, `radiogroup`, `radio`, `slider`, `separator`), never by
  antd's DOM; the slider's story presses the key as antd reads it (the key
  code), the suite presses the real key in Edge.
- **Ren:** two cautions, no objection. A mount animation is the appearance,
  so a widget that flips often animates often — the page builder's choice,
  and `prefers-reduced-motion` turns it off. The `( … )` button nests
  without limit; a page builder who nests five deep gets what they asked
  for, and the words still read.
- **Vlad:** `Appearing` is one ternary; `templateOf` grew one spread.

## Reviewed 2026-11-02, later (the disappearance, the appearance registry)

- **Morgan:** a widget that fades out instead of blinking away, and the
  application's own animation in the list beside the standard ones — what
  a page builder expects from "appearance". The button variants
  (primary, secondary, dashed, danger) are the other half of looking
  finished.
- **Alexei:** the registry is the predicates' pattern to the letter —
  schema definitions, engine registry with invariants, `STANDARD_*` sealed
  default, a `*Problems` function folded into `contractProblems`, one
  optional registry on `ResolveInput`. One concern raised and answered: the
  name grammar is in the schema (`APPEARANCE_NAME`) so the schema can parse
  a template without the registry, and the registry says which names exist.
- **Dmitri:** `useShowing` is two effects and a boolean, and its header
  says why reduced motion unmounts at once. The inline `animationName` is
  the one place the guidelines allow a style: the value comes from the
  view model, and it replaced five classes that said the same thing.
- **Ren:** reverse playback is the cheap and honest choice — one set of
  keyframes, no second stylesheet to keep in step — but a host that wants
  a different way out than in must register two names (`drop` in,
  `fade` out), which the two keys allow. The other caution: a leaving
  widget keeps reading the store for 320 ms; a `load` fired in that window
  would be a bug, and nothing fires on unmount, so it is not one.
- **Sasha:** the suite asserts `data-disappear`, the state JSON and — the
  real proof — that a hidden cell is EMPTY once the animation has ended
  (Playwright retries the assertion through the 320 ms). The application's
  `drop` is asserted on the run page, so a renamed registration breaks a
  scenario. The adapter's test fires `animationend` itself.
- **Vlad:** `appearChoicesOf` is one map; the two selects are one map over
  a tuple.
- **External reviewer:** less than before in the stylesheet (five classes
  gone), one hook added, one registry added by the pattern that already
  existed. `Appearing` still renders no element without an animation.

## Built and tested

Built 2026-11-01, all three phases, the constructor the same day. Tested in
`e2e/features/conditions.feature` (the runs page's button, the run page's
error line, the host predicate, a condition typed in the builder and
deciding on the page, several conditions with "unless", a refused value,
the edit-mode note and removing a condition, an unknown predicate as a
cell problem with the page standing, the constructor read back and
deciding, the host's check offered by its phrase), the engine's
`expressions.test.ts` (the grammar, precedence, every parse failure as a
sentence, a constructor member held, subscribed and reported), `app.feature` ("Nothing opens
while no run is selected — the button is not even shown"), the
`WidgetBuilder` `ShowsWhen` story, `PageView.test.tsx` ("a cell with a
condition"), `useWhen.test.ts`, the engine's `predicates.test.ts`, the
schema's `when.test.ts`, the builder's `form-when.test.ts` and
`use-widget-builder.test.tsx`, the antd builder's form test.
