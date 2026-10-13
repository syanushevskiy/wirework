# Keep it simple — review of `events`, `engine` and `store`

A pass over the three framework-free packages with one question per line
of code: what does it earn? The rule applied is the one these packages
already live by — ONE implementation per concept, nothing exported that
nothing imports, prose that explains a decision once and in one place.

Reviewed 2026-10-13. The "applied" sections record what this review cut;
the "open" sections are findings left for a decision, each with a size and
a verdict: **cut** (no consumer, no behaviour change), **merge** (two
implementations of one rule), **decide** (a simplification that changes a
message or a contract someone relies on).

## Summary

| Package  | Source lines | Test lines | Applied                         | Open findings |
| -------- | ------------ | ---------- | ------------------------------- | ------------- |
| `events` | 62           | 84         | 4 exports → 2, −31 lines        | none          |
| `engine` | ~1 180       | ~1 180     | 55 public names → 29, −70 lines | 9 (see below) |
| `store`  | ~240         | ~400       | —                               | 5 (see below) |

What every package gets right: a single implementation behind each
contract, failures as data on a plan rather than throws, no `this`, no
classes beyond two one-line errors, and tests that name the promise they
pin. The findings below are at the edges: duplicated rules, plumbing
around one-use types, and prose kept in three places.

## `@wirework/events`

### Applied

- The public surface is `createEventBus` and `EventLoopError`. The filter
  matcher and the depth limit were exported for one test each and are now
  private; the test asserts the literal `32`, which is what the README
  promises.
- `EventLoopError` carried `widgetType` and `eventName` that nobody read:
  the message already names both. It is a one-line `name` override now.
- The `Subscription` interface and a `notify` helper were folded into one
  `for` loop over the snapshot, with the isolation `try`/`catch` inline.
- The 18-line header duplicated the README and
  `widget-events-design.md`; it is one line pointing at the doc.

### Open

Nothing. 62 lines, every one with a job.

## `@wirework/engine`

### Applied

- **Nineteen names left the index** because nothing outside the package
  imported them: the host-registry extension point (`createNamedRegistry`,
  `Invariant`, `NamedRegistry`, `NamedRegistryOptions`), two internal
  checks (`checkPageReactions`, `PageReactions`), `WidgetEventError`,
  `RegistrationError`, and twelve types that only named parts of exported
  types (`WidgetRegistryOptions`, `ReactionTarget`, `FallbackNote`,
  `ResolvedCellProblem`, `ResolvedPagePlan`, `ResolvedPageProblem`,
  `ProblemSeverity`, `ValidateInput`, `ValidationProblem`,
  `ValidationReport`). Tests import them from their modules, as the index
  always said they should. The build has no `isolatedDeclarations`, so an
  exported signature may name an internal type.
- **Both error classes** lost their fields (`registry`/`key`,
  `widgetType`/`eventName`): unread, and the messages carry the same facts.
- **`sameList`** sorted one side inside an `every` callback, once per
  element; it compares two sorted copies now.
- **The index header** (14 lines restating the README) is one line.

The one applied cut that removes a DESIGNED feature rather than dead
weight is the host-registry extension point. The implementation stays (it
is the one registry behind the four extension points) and its test still
runs from the module; only the promise that a host may build "a fifth
extension point" is withdrawn until a host wants one.

### Open

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                | Where                                                                | Size      | Verdict    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- | ---------- |
| E1  | **Two rules for one check.** A page's load reactions and a cell's reactions are checked by two functions that test the same three things (unknown action, arguments the action's `params` refuse, a `from` that names no payload field). `contractProblems` could take `events` and `inputs` instead of a definition and serve both. Cost: the page message loses its `on load:` prefix, which `load-events.feature` asserts verbatim. | `page-events.ts` `reactionProblem` · `resolve.ts` `contractProblems` | ~25 lines | **merge**  |
| E2  | **Four passes over one list.** `contractProblems` walks `reactions` four times building four arrays, each with its own cast of the reaction, then joins them. One loop appending to `parts` is shorter and the view model is already parsed by the widget's schema, so `on` is an `EventBindings`, not `unknown`.                                                                                                                      | `resolve.ts` `contractProblems`                                      | ~20 lines | **cut**    |
| E3  | **Cell-problem text exists twice.** The validator's `cellProblemMessage` and the React adapter's `problemMessage` are the same `switch` over `CellProblem` with different wording. One sentence per problem kind, produced by the engine, rendered by the adapter.                                                                                                                                                                     | `validate.ts` · `react/src/CellView.tsx`                             | ~15 lines | **merge**  |
| E4  | **`errorText` is `problemText` minus a case.** `problemText` falls back to `errorText` for anything that is not a validator error. The thirteen callers of `errorText` would be correct with `problemText`; one function instead of two.                                                                                                                                                                                               | `messages.ts`                                                        | 1 export  | **decide** |
| E5  | **Severity plumbing.** `validateViewModels` builds two closures (`error`, `warn`) of one `Report` type and passes both down to `validateCells`. One `report(severity, location, message)` halves it.                                                                                                                                                                                                                                   | `validate.ts`                                                        | ~8 lines  | **cut**    |
| E6  | **Three tree walkers.** `collectPaths`, `boundPaths` and `deepMerge` each hand-roll a bounded recursive walk over a plain-object tree with its own depth guard and prototype filter. A shared `walk(tree, visit)` would leave each with only its visit.                                                                                                                                                                                | `paths.ts`                                                           | ~15 lines | **decide** |
| E7  | **The user-page spread, three times.** `updateUserPageTemplate`, `updateUserCellSettings` and `removeUserCell` each rebuild `userViewModels.pages[page]` by hand. An `updateUserPage(userViewModels, page, update)` helper leaves each with its one change.                                                                                                                                                                            | `trees.ts`                                                           | ~10 lines | **cut**    |
| E8  | **A redundant key check.** `!key \|\| typeof key !== "string" \|\| !pattern.test(key)`: `KEBAB_NAME` refuses the empty string, so `!key` adds nothing.                                                                                                                                                                                                                                                                                 | `named-registry.ts`                                                  | 1 clause  | **cut**    |
| E9  | **Module headers restate the docs.** `reactions.ts` (28 lines), `resolve.ts` (18), `page-events.ts` (13) and `validate.ts` (13) open with the design rationale that `widget-events-design.md` and `actions-design.md` hold. The events package now keeps one line and a pointer; the engine could follow. What stays in code is the non-obvious local decision (`// Own properties only: …`).                                          | every module                                                         | ~70 lines | **decide** |

Not findings, though they look like candidates: the conditional spreads
(`...(note === undefined ? {} : { note })`) follow the guidelines'
`exactOptionalPropertyTypes` rule; `readableStore`'s four forwarders are
the enforcement, not a cast; `layout-engine-checks.ts` is already the
shortest correct statement of its promises.

## `@wirework/store`

### Open

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                           | Size      | Verdict    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------- | ---------- |
| S1  | **`splitPath` re-checks what `checkedSegments` checks.** The schema function already throws on an empty path ("has an empty segment"); the wrapper exists to say "must be a non-empty dot-separated string" instead, and one test asserts that wording. Call `checkedSegments` directly and let the test assert the schema's message.                                                                                      | `index.ts` `splitPath`          | 6 lines   | **cut**    |
| S2  | **Seven tests re-pin the schema's path rules.** "index 0 starts a LIST", "numeric id is a MAP", "canonical index only", "missing child through the prototype chain", "non-numeric segment through an array", "replace a primitive parent", "prototype-polluting writes" are `setPath`/`getPath` promises, each already pinned in `schema/src/__tests__/paths.test.ts`. The store needs ONE test that it delegates to them. | `__tests__/store.test.ts` `set` | ~45 lines | **cut**    |
| S3  | **Overlapping layer tests.** Four `replace` cases could be two (page-only tree; tree naming some shared roots), and "stops a path subscription in the layer that owns it" and "gives a new snapshot when only the shared layer changed" restate "notifies a path from its own layer" and "the same snapshot while nothing changed".                                                                                        | `__tests__/layers.test.ts`      | ~35 lines | **cut**    |
| S4  | **`StateObject` is declared twice.** Both files alias `Record<string, unknown>` under the same name.                                                                                                                                                                                                                                                                                                                       | `index.ts` · `layers.ts`        | 1 line    | **cut**    |
| S5  | **`replace` copies, `set` does not.** `replace` spreads `next` into a fresh object while `set` stores the given value by reference ("live references by convention"). If the copy is there so a `replace` with the same object still notifies, that is a decision worth one comment; if not, it is one inconsistency to remove.                                                                                            | `index.ts` `replace`            | 1 line    | **decide** |

`fromZustand`'s 30-line header is the one place the notification model
("derived from the STATE, never from which method wrote it") and the
devtools naming are explained; the README carries the summary. It stays.

## Order of work

1. The **cut** rows: no consumer and no behaviour change (E2, E5, E7, E8,
   S1–S4). Mechanical, one commit.
2. The **merge** rows: E3 first (one sentence per problem kind, both
   renderers), then E1 with the e2e assertion updated to the new message.
3. The **decide** rows need an owner's call: E4 and E9 touch every package;
   E6 and S5 are judgment calls on whether a helper or a comment is the
   simpler thing.
