# Keep it simple — review of `events`, `engine` and `store`

A pass over the three framework-free packages with one question per line
of code: what does it earn? The rule applied is the one these packages
already live by — ONE implementation per concept, nothing exported that
nothing imports, prose that explains a decision once and in one place.

Reviewed 2026-10-13. The "applied" sections record what this review cut;
the "open" sections are findings left for a decision, each with a size and
a verdict: **cut** (no consumer, no behaviour change), **merge** (two
implementations of one rule), **decide** (a simplification that changes a
message or a contract someone relies on), **keep** (tried, and the code
was better before).

## Summary

| Package  | Source lines | Test lines | Applied                         | Open findings |
| -------- | ------------ | ---------- | ------------------------------- | ------------- |
| `events` | 62           | 84         | 4 exports → 2, −31 lines        | none          |
| `engine` | ~1 150       | ~1 190     | 55 public names → 29, −75 lines | 6 (see below) |
| `store`  | ~230         | ~320       | 39 tests → 29, −80 lines        | 1 (see below) |

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
  `doc/ADR/0002-widget-events.md`; it is one line pointing at the doc.

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
- **One pass over the reactions** (was E2): `contractProblems` walked the
  list four times, each with its own cast; it is one loop with one cast at
  the boundary. The cast says `Partial<EventBindings>`, not
  `EventBindings`: zod keeps a reaction list left explicitly `undefined`
  under its key, and the first version of this cut iterated it — a crash
  where the old code saw no reaction. Found in review; a regression test
  pins it.
- **One `updateUserPage` helper** (was E7) rebuilds a page of the user
  overlay; the three edits of it keep only their own change.
- **The redundant `!key`** (was E8) is gone: `KEBAB_NAME` refuses the empty
  string.

The one applied cut that removes a DESIGNED feature rather than dead
weight is the host-registry extension point. The implementation stays (it
is the one registry behind the four extension points) and its test still
runs from the module; only the promise that a host may build "a fifth
extension point" is withdrawn until a host wants one.

### Open

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                        | Where                                                                | Size      | Verdict    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------- | ---------- |
| E1  | **Two rules for one check.** A page's load reactions and a cell's reactions are checked by two functions that test the same three things (unknown action, arguments the action's `params` refuse, a `from` that names no payload field). `contractProblems` could take `events` and `inputs` instead of a definition and serve both. Cost: the page message loses its `on load:` prefix, which `load-events.feature` asserts verbatim.         | `page-events.ts` `reactionProblem` · `resolve.ts` `contractProblems` | ~25 lines | **merge**  |
| E3  | **Cell-problem text exists twice.** The validator's `cellProblemMessage` and the React adapter's `problemMessage` are the same `switch` over `CellProblem` with different wording. One sentence per problem kind, produced by the engine, rendered by the adapter.                                                                                                                                                                             | `validate.ts` · `react/src/CellView.tsx`                             | ~15 lines | **merge**  |
| E4  | **`errorText` is `problemText` minus a case.** `problemText` falls back to `errorText` for anything that is not a validator error. The thirteen callers of `errorText` would be correct with `problemText`; one function instead of two.                                                                                                                                                                                                       | `messages.ts`                                                        | 1 export  | **decide** |
| E5  | **Severity plumbing.** `validateViewModels` builds two closures (`error`, `warn`) of one `Report` type and passes both down to `validateCells`. Tried as one `report(severity, location, message)`: 28 lines in, 29 out, and twelve call sites that read as English (`warn(location, text)`) became `report("warning", location, text)`, three of them wrapped onto four lines. Reverted: a cut that saves nothing and costs reading is churn. | `validate.ts`                                                        | 0 lines   | **keep**   |
| E6  | **Three tree walkers.** `collectPaths`, `boundPaths` and `deepMerge` each hand-roll a bounded recursive walk over a plain-object tree with its own depth guard and prototype filter. A shared `walk(tree, visit)` would leave each with only its visit.                                                                                                                                                                                        | `paths.ts`                                                           | ~15 lines | **decide** |
| E9  | **Module headers restate the docs.** `reactions.ts` (28 lines), `resolve.ts` (18), `page-events.ts` (13) and `validate.ts` (13) open with the design rationale that `doc/ADR/0002-widget-events.md` and `doc/ADR/0005-actions.md` hold. The events package now keeps one line and a pointer; the engine could follow. What stays in code is the non-obvious local decision (`// Own properties only: …`).                                      | every module                                                         | ~70 lines | **decide** |

Not findings, though they look like candidates: the conditional spreads
(`...(note === undefined ? {} : { note })`) follow the guidelines'
`exactOptionalPropertyTypes` rule; `readableStore`'s four forwarders are
the enforcement, not a cast; `layout-engine-checks.ts` is already the
shortest correct statement of its promises.

## `@wirework/store`

### Applied

- **`splitPath` is gone** (was S1): `checkedSegments` already throws on an
  empty path; the wrapper existed to reword that one message, and one test
  asserted the wording. The store calls the schema directly.
- **Seven path-rule tests became one** (was S2): "index 0 starts a LIST",
  "numeric id is a MAP", "canonical index only", "missing child through the
  prototype chain", "non-numeric segment through an array", "replace a
  primitive parent" and "prototype-polluting writes" were `setPath`
  promises already pinned in `schema/src/__tests__/paths.test.ts`. One test
  now shows the store applies them.
- **Four layer tests went** (was S3): two `replace` cases merged into one
  that shows the split AND the unnamed shared roots staying; the empty-tree
  case restated the page-only one. The stop-subscription and
  shared-only-snapshot cases did NOT restate anything — each was the only
  test of one branch (a path-level unsubscribe; the shared side of the
  snapshot cache) — so their assertions moved into the neighbouring tests.
  Found in review.
- **`StateObject` is declared once** (was S4), in `layers.ts`.

### Open

| #   | Finding                                                                                                                                                                                                                                                                                                                         | Where                | Size   | Verdict    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ | ---------- |
| S5  | **`replace` copies, `set` does not.** `replace` spreads `next` into a fresh object while `set` stores the given value by reference ("live references by convention"). If the copy is there so a `replace` with the same object still notifies, that is a decision worth one comment; if not, it is one inconsistency to remove. | `index.ts` `replace` | 1 line | **decide** |

`fromZustand`'s 30-line header is the one place the notification model
("derived from the STATE, never from which method wrote it") and the
devtools naming are explained; the README carries the summary. It stays.

## Order of work

1. ~~The **cut** rows (E2, E5, E7, E8, S1–S4).~~ Applied 2026-10-13 and
   reviewed by the tiger team: E5 reverted (**keep**), E2's cast widened
   to `Partial` with a regression test, two layer assertions and one store
   assertion restored. Unit suites and the e2e suite green; no message or
   contract changed.
2. The **merge** rows: E3 first (one sentence per problem kind, both
   renderers), then E1 with the e2e assertion updated to the new message.
3. The **decide** rows need an owner's call: E4 and E9 touch every package;
   E6 and S5 are judgment calls on whether a helper or a comment is the
   simpler thing.
