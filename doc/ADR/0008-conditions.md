# ADR-0008: Conditions — a widget shown when a predicate holds

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

A widget's view model may carry `when`: a list of named checks, each over one
store path with one literal, joined as AND of ORs; the widget shows only while
it holds. The checks are predicates in a registry — eight standard ones, the
application's own by name. The constructor composes the same checks in words
with `and`, `or`, `not` and parentheses. A hidden cell keeps its place, empty.
`appear` and `disappear` name an animation. All built; `any` rows in the form,
conditions on row actions and input validation from code are not.

## 2. Problem

A page could not say "show this only when…". Every widget decided its own
emptiness (a label with no text, a tag with no value) — not configurable, and
useless for a button, a table or an input.

The ask: conditional rendering from configuration, with predefined checks —
equal, contains for text, true/false for booleans, greater and less for
numbers — and a way for an application to register checks of its own. Three
needs are behind it: hide a control from users who may not use it; show an
error or a "nothing here" line only when there is something to say; show a
record's details only once it has loaded.

Two earlier lines stood against it: "reactions never transform" and "no
conditionals or formats ever enter a cell's configuration"
(doc/ADR/0002-widget-events.md). This record says how far that line moves: it
stands against EXPRESSIONS over values (arithmetic, two paths compared), not
against a closed set of named comparisons the engine owns.

## 3. Details

### The rules

- **One path, one named check, one literal.** No comparison of two paths: a
  value that needs computing is computed by an action into the store — derive
  in code, test in configuration.
- **A missing check is a predicate with a name**, never an expression.
- **Each comparison has ONE rule**, written in the predicate's description.
- **The condition is WIRING.** It lives beside `inputs` and `on` in the
  widget's view model — not on the layout cell, not on reactions — and is
  refused in the user overlay: a user's view cannot hide what the page shows
  (a user removes the cell from their own view instead).
- **Evaluation is a pure function in the engine**; the React adapter only
  subscribes.
- **Everything the user reads is one function's sentence** (`whenText`): the
  form's summary, the edit-mode note, the problem messages.
- **A hidden cell is a FACT on the page:** the cell element stays, empty, with
  `data-when="false"`. No layout reflows on store changes.

### The shape

`when` is a list of tests that must ALL hold. A test reads one store path and
names one predicate, with the literal the predicate takes; `not: true` negates
it ("unless"). A member may be `{ any: [tests] }`, which holds when ONE of its
tests does — one level, no `all` key, no `not` block.

```ts
// the error line shows only once there is an error
error: { default: { inputs: { text: "run.error" }, tone: "danger",
  when: [{ path: "run.error", is: "empty", not: true }] } }

// a Retry button for admins and owners, on a failed or stuck run
retry: { default: { label: "Retry", on: { clicked: [{ call: "runs/retry" }] },
  when: [
    { path: "app.permissions.role", is: "one-of", to: ["admin", "owner"] },
    { any: [
      { path: "run.data.status.state", is: "equal", to: "Failed" },
      { path: "run.data.status.state", is: "equal", to: "Running" },
    ] },
  ] } }

// a check the application wrote: code with a name
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
```

`whenSchema` is a non-empty list of tests, `{ any: [tests] }` members and
`{ expression }` members (the constructor, below).

- `RESERVED_VIEW_MODEL_KEYS` are `inputs`, `on`, `when`, `appear`,
  `disappear`. `widgetBindingsSchema` derives `when` into every view-model
  schema; `defineContract` refuses a setting of that name; the overlay's
  settings may not carry it; `WidgetBindings` has `when?: When`.
- An empty list is refused (`min(1)`): "show when nothing" is a mistake, not
  "always".
- `to` beside a predicate that takes none, or missing for one that takes it,
  is a cell problem, not a silent default.
- No `when`: the widget always shows.

### The constructor

A third kind of member, for what AND of ORs cannot say: the condition in
WORDS.

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

- The leaves are the same tests: a store path, a registered predicate by its
  PHRASE ("is greater than", a host's "can be retried" — matched word for
  word, the longest phrase first), and its literal (several, comma-separated,
  for a list check).
- Only `and`, `or`, `not` and the parentheses are new; `and` binds tighter
  than `or`. It is composition of CHECKS, never an expression over values.
- The engine parses it once per registry and text (`parsedExpression`,
  `expressions.ts`) into a tree of `all` / `any` / `unless` over tests.
  `holds` walks it, `whenPaths` reads its leaves, `whenText` echoes the words.
- `whenProblems` reports a text that cannot be read, as a sentence — `when[0]
cannot be read: expected a value after "is greater than"`, `missing ")"`,
  `expected a check after "run.error" (checks: …)` — then every leaf's
  problems as for a plain test. A constructor that cannot be read never holds.

In the builder it is the check list's last entry, "constructor — build the
condition step by step". The row becomes a TREE read left to right as the
condition it builds: `not ( a and b ) or ( c and d )`.

- A part is a test (the same fields as a row) or a nested group between "("
  and ")". Groups nest without limit.
- The word between two parts is a button that switches the group's joiner
  between "and" and "or"; "not" before a group is a button.
- After the last part the joiner once more ("and …") adds a test and "( … )"
  adds a group inside; × removes a part or a group.
- Every kind of element has its own colour (`styles.css` names the roles).
- The form prints the tree to words after every step and shows them as the
  sentence — or "finish every condition" while a test is blank, or the test's
  own problem — and Add waits.
- What is saved is the words. The editor parses them back into the tree
  (`draftsOfWhen` with the registry). Words the form cannot read stay as they
  are, with the problem, and are not saved over.
- Headless state: `GroupDraft` / `TestDraft`; one callback
  `editConstructor(index, at, edit)` with `at` the part's place ("", "1",
  "1.0") and `TreeEdit` the step (`set`, `group`, `add`, `"remove"`);
  `editTree` is the pure function behind it.

### The predicates

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

The standard set (`standardPredicates`, declared in `@wirework/schema` beside
the grammar because its arguments are zod) is built into every registry:

| name       | `to`                      | holds when                                                                                                   |
| ---------- | ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `empty`    | —                         | the value is undefined, null, `""`, `[]` or `{}` — the emptiness `useBoundText` uses                         |
| `true`     | —                         | the value is exactly `true` (a missing value is neither: `not true` holds, `false` does not)                 |
| `false`    | —                         | the value is exactly `false`                                                                                 |
| `equal`    | string \| number \| bool  | the value AS TEXT (`valueText`) equals `to` as text — `5` equals `"5"`, like the tag cell's tones            |
| `one-of`   | a non-empty list of those | the value as text equals one of `to` as text                                                                 |
| `contains` | non-empty string          | the value as text contains `to` (case-sensitive; an object or list is its JSON)                              |
| `greater`  | number                    | the value is a finite number, or text that is one (`"5"`, not `""`, not a boolean), and is greater than `to` |
| `less`     | number                    | same reading of the value, less than `to`                                                                    |

`at-least` is `not less`; "is set" is `not empty`. The set stays at eight so
the form's dropdown reads at a glance. A regex check, case-insensitive text,
dates and durations are host predicates: the host knows its data.

### Registering the application's own

```ts
// @wirework/engine
export type PredicateRegistry = NamedRegistry<PredicateDefinition>;
/** A registry with the standard predicates already in it; the host adds its own before sealing. */
export function createPredicates(): PredicateRegistry;
```

The fifth extension point, in the host's boot next to contracts, widgets,
layout engines and actions — created, filled, sealed:

```ts
// apps/playground/src/demo/install.ts
predicates.register({
  name: "runs/retryable",
  description: "A failed run the fake server would accept again (its id is even)",
  phrase: "can be retried",
  test: (run) => isRetryable(run),
});
```

- Invariants at registration: the name matches `PREDICATE_NAME`, `test` is a
  function, `phrase` and `description` are non-empty, `argument` when given
  has `parse`.
- A standard name cannot be registered again: the standard set is the
  grammar's vocabulary, not a list a host might forget.
- Registries are sealed after boot.
- `STANDARD_PREDICATES` is the standard set alone, sealed: what every function
  evaluates against when no registry is given.
- A predicate is a pure function of the value and the literal. Anything that
  needs the store, the bus, the clock or a request is an ACTION that writes a
  value the condition then reads. A two-path comparison is the same case.

### Evaluation and rendering

```ts
// @wirework/engine, predicates.ts — pure; `predicates` defaults to STANDARD_PREDICATES
export function holds(when: When | undefined, read: (path: string) => unknown, predicates?: PredicateRegistry): boolean;
export function whenPaths(when: When | undefined): readonly string[]; // what to subscribe to
export function testText(test: WhenTest, predicates?: PredicateRegistry): string; // 'when run.state equals "Failed"', "unless run.error is empty"
export function whenText(when: When, predicates?: PredicateRegistry): string; // the tests joined
export function whenProblems(when: When | undefined, predicates?: PredicateRegistry): string | undefined;
```

- `holds`: every member holds; an `any` member holds when one of its tests
  does; a test is `predicates.get(is).test(read(path), to) !== (not === true)`.
- An unknown predicate at runtime does not hold (boot and resolve reported
  it).
- `read` is injected: a cell reads the store (`store.get`).

The adapter evaluates where the cell renders, not in the plan: the plan is
memoized on configuration and a condition is a runtime fact.
`useWhen(store, when, { predicates, onError })` is one `useSyncExternalStore`
subscribed to `whenPaths(when)`; its snapshot is the answer — shown, hidden,
or the message of a predicate that threw. `CellView` renders:

- **shown** — the cell element carries `data-when="true"` (no attribute when
  the template has no `when`);
- **hidden, view mode** — the cell element stays in the layout with
  `data-when="false"` and nothing inside: the engine's slot keeps its place,
  the widget is UNMOUNTED. The hole is the page builder's to place;
- **hidden, edit mode** — the widget renders anyway, dimmed
  (`ww-cell-hidden-now`), with a note above it (`cell-hidden-note`): "hidden
  now — shows unless run.error is empty".

Consequences:

- An unmounted widget reads nothing and emits nothing. Its state is in the
  store, so it comes back as it was.
- A table that appears when its condition turns true fires `load` and requests
  its rows. A condition that flips often is a request each time.
- The cell's REACTIONS stay bound whether it shows or not; nothing emits from
  a hidden cell, so nothing runs.
- A host predicate that throws is a crash of the cell: the hook catches it,
  the cell shows the crash placeholder (`WidgetCrash`) and reports through
  `PageView.onError`. The page stands, and the cell recovers when the value
  changes.
- The palette preview ignores `when`.

### Appearance

A widget with a condition may say how it APPEARS when the condition turns true
and how it DISAPPEARS when it turns false: `appear` and `disappear`, each the
NAME of an animation — never a duration or a curve in configuration. Both are
bindings like `when`: derived into the schema, refused as settings, kept out
of the overlay.

- The names are a registry, the sixth extension point. `createAppearances()`
  in the engine starts with the standard five (`standardAppearances` in the
  schema: `fade`, `slide-up`, `slide-down`, `zoom`, `flip`, each with a
  description) and takes the host's own — a kebab-case name and a description
  — until it is sealed. `STANDARD_APPEARANCES` is the standard set alone.
- The name grammar is in the schema (`APPEARANCE_NAME`), so a template parses
  without the registry; the registry says which names exist.
- A name nobody registered is a contract problem (`appearanceProblems`, part
  of `contractProblems` given `ResolveInput.appearances`).
- The adapter draws a name as the CSS keyframes `ww-<name>`. The element
  around the widget (`.ww-appear`, 320 ms, eased) plays them FORWARD when it
  mounts and in REVERSE (`.ww-disappear`, `animation-direction: reverse`) on
  its way out. A host that wants a different way out than in names two
  animations.
- A host registers its own by naming it and writing `@keyframes ww-<name>` in
  its stylesheet (the playground's `drop`: `demo/install.ts`, `ww-drop` in
  `index.css`).
- On the way out the widget stays MOUNTED until `animationend`, then leaves
  (`useShowing`); shown again before that, it stays and plays its appearance.
  It keeps reading the store meanwhile; nothing fires on unmount.
- Under `prefers-reduced-motion` the stylesheet plays nothing, so the hook
  unmounts at once.
- `Appearing` renders no element when there is nothing to appear with.
- The cell carries `data-appear` and `data-disappear`.
- The builder offers both under the conditions ("appears with", "disappears
  with"), only while there is a condition. `collect()` saves them only with a
  condition and only when the registry knows the name.

### Validation

`checkTemplate` parses `when` with the rest of the view model: the schema
refuses a configuration path, a malformed name, an empty list, an unknown key.
`contractProblems` adds `whenProblems`, given the predicate registry
(`ResolveInput.predicates`), so resolve and boot validation say the same:

- `the condition is wrong: when[1] uses an unknown predicate "equals" (registered: empty, true, false, equal, one-of, contains, greater, less, runs/retryable)`
- `the condition is wrong: when[0] gives "greater" a value it refuses: (root): Expected number, received string`
- `the condition is wrong: when[2] gives "empty" a value, and it takes none`
- `the condition is wrong: when[0].any[0] gives "equal" no value, and it takes one`

A broken `when` is an `unmet-contract` cell problem: the placeholder names it,
the page renders. Nothing checks the TYPE at the path against the predicate
(the store is live data).

### Builder

A "Show when" section in the widget form, under the reactions:

- rows added with "+ condition" and removed with ×. Each row: a "when /
  unless" select for `not`, a path (a combobox over the existing data paths,
  `compatibleStorePaths`), a check (the standard phrases, then the host's with
  its namespace — "can be retried (runs)"), and a value field whose kind
  follows the predicate's `argument` (`argumentKind` in `@wirework/schema`:
  text, a number typed as text, a list as comma-separated text, a yes/no or an
  enum as a select, JSON; nothing for `empty` / `true` / `false`);
- under the row its sentence (`testText`) — or why the value cannot be used;
- a row with a path and a check is a condition; a blank row is dropped by
  `collect()`; a row with only one of the two, or a value the predicate
  refuses, gates Add;
- `any` is NOT offered by the form: the inspector writes it, the form shows
  such members read-only ("one of — written in the inspector") and keeps them
  on save;
- the editor prefills from the resolved view model (`valuesFromViewModel`);
- on the user overlay target the section is read-only like ports and
  reactions, and a save there carries no `when`.

Ids (`@wirework/antd-builder/ids`, `conditionFieldId(part, index)`):
`condition-path`, `condition-is`, `condition-to`, `condition-not`,
`condition-sentence`, `condition-problem`, `condition-remove` for the first
row, `condition-2-path`, … for the next, `condition-add` for the section. Rows
carry `[data-testid="widget-condition"][data-index]`, the section
`widget-conditions` and, while empty, `widget-conditions-always`.

Headless state in `@wirework/builder` (`form-when.ts`): `ConditionDraft`,
`ConditionField`, `literalOf`, `predicateChoices`, `whenOfConditions`,
`draftsOfWhen`; the hook's `conditions`, `predicateChoices`, `conditionPaths`,
`addCondition`, `removeCondition`, `setCondition(index, field, value)`.
`collect()` returns `when` in the bindings and `templateOf(bindings,
settings)` writes it into a template.

### Packages

- `@wirework/schema`: `contracts/when.ts` (`whenSchema`, `When`, `WhenTest`,
  `WhenAny`, `PredicateDefinition`, `standardPredicates`), `PREDICATE_NAME` in
  `names.ts`, `valueText` in `paths.ts` (the one text of a value), `argumentKind`
  in `settings.ts`.
- `@wirework/engine`: `predicates.ts`, `expressions.ts`,
  `ResolveInput.predicates` / `.appearances`; `checkTemplate` and
  `contractProblems` take the registries.
- `@wirework/react`: `useWhen`, `useShowing`, `CellView`, `WidgetCrash`;
  `PageView` / `usePagePlan` / `usePageRenderers` take `predicates`.
- `@wirework/builder`: `form-when.ts`, `templateOf` in `form-drafts.ts`;
  `@wirework/antd-builder`: the "Show when" section, `predicates` on
  `WidgetBuilder` and `WidgetEditor`.
- `apps/playground`: `Registries.predicates`, `runs/retryable`.

### How it is tested

`e2e/features/conditions.feature` (story WW-25 in doc/product-stories.md); the
engine's `predicates.test.ts` (a table test per built-in over the awkward
values) and `expressions.test.ts`; the schema's `when.test.ts`;
`useWhen.test.ts` and `PageView.test.tsx`; the builder's `form-when.test.ts`;
the `WidgetBuilder` `ShowsWhen` story.

### Not built

- `any` rows in the form.
- A condition on a row action (`enabled: When`, `holds` with `read` = the
  row's property) — the same grammar and registry.
- Input validation from code: the custom validators of
  doc/ADR/0002-widget-events.md are predicates on the input's value.

### Open point for the owner

Whether a USER may hide a widget for themselves ("hide for me when…" in the
overlay). It would be a second `when`, ANDed — never a way to show what the
page hides.

## 4. Options weighed

**What a condition may say**

| Option                                        | Verdict                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refuse it                                     | Dropped. Every widget goes on deciding its own emptiness, and the three needs stay unanswered.                                                                  |
| An expression language over VALUES            | Dropped. Arithmetic, `{ "$gt": … }` trees, two paths compared: nobody can validate it, and it is what the earlier line was drawn against.                       |
| A closed set of named checks, plus a registry | Chosen. One path, one check, one literal; a computed value is an action's job. Costs a fifth registry, and a missing check has to be written in code and named. |

**Where it is written**

| Option                     | Verdict                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| On the widget's view model | Chosen. It is wiring, beside `inputs` and `on`: one schema, one validation, one overlay rule.                                       |
| On the layout cell         | Dropped. A cell belongs to its engine, a user's own template is a copy of the layout, and Share / Import would carry the condition. |
| On reactions               | Dropped. A conditional reaction is the first step of a workflow engine — an action decides what it does.                            |

**Smaller choices**

- `all` and `not` blocks in the JSON — dropped: the list already is the AND,
  and `not: true` on a test reads as "unless".
- Reflowing the layout around a hidden cell — dropped: a layout that moved on
  every store change would be unusable, and edit-mode placement must stay
  where the user put it. A hole is accepted.
- A regex predicate in the standard set — left to a host that wants one.
- The standard checks registered by the host — dropped: a host could forget
  `equal` and break every page. They are built in.
- A second set of keyframes for the way out — dropped: reverse playback serves
  both directions with one set and no second stylesheet to keep in step.
- An element around every widget for the animation — dropped: `Appearing`
  renders none without an animation, so pages without conditions pay nothing.
