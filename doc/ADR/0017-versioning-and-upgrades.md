# ADR-0017: Versions and upgrades — the packages, the libraries under them, and stored templates of any age

- **Status:** Accepted — the data format built (the stamp, the door, the chain); the release tooling not
- **Date:** 2026-11-14
- **Deciders:** the tiger team (doc/team_tiger.md) and the product owner

An architecture decision record. Designed 14 November 2026 with the tiger
team; the data-format half — phase 2 and the chain of phase 3 — built the
same day on the team's own choices ("Built" at the end). The release
tooling of phase 1 is not built, and the five points under "For the owner
to decide" stay open.

## The ask

Wirework is published as packages, sits on third-party libraries (antd,
FlexLayout, gridstack, react-grid-layout, zod, React) and — unlike most
libraries — its users STORE what they build with it: a page template, a
user's own view, a widget's settings. A host upgrades the packages; the
data was written by whatever version was installed that day. So:

1. How are the packages versioned, and what counts as a breaking change?
2. How are the libraries under them updated without the update reaching
   what people stored?
3. A template made **two years ago**, **a year ago**, **a week ago**: what
   happens to each when the application is upgraded?

## The answer in short

- Every stored document says which DATA FORMAT it was written in. A
  document without the mark is format 1 — everything stored up to today.
- The packages carry an ordered chain of small pure MIGRATIONS, one per
  format change. Data is brought to the current format WHEN IT IS READ, in
  memory, before anything else sees it, and is written back in the current
  format the next time it is saved. Nobody runs anything by hand; a host
  that wants its database current runs the same function as a batch.
- The chain is kept for at least 24 months of formats, so the template of
  two years ago takes the same road as the one of last week — only longer.
- Data from a NEWER format than the code (a rollback, a file from a
  colleague on a newer build) is never guessed at and never overwritten:
  the page shows the shared layout and editing is locked with the reason.
- Most changes need none of this: adding an optional setting with a
  default is already compatible. The rule until the chain exists is
  "additive only".
- The packages are versioned together (one number for all of them), by
  semantic versioning, where the stored data, the DOM facts tests read and
  the names pages use are part of the public API beside the TypeScript one.

| The template was saved | What it holds today                | On the first visit after an upgrade                                                                                        | What the user notices                                |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| a week ago             | the current format, or one behind  | nothing, or one step                                                                                                       | nothing                                              |
| a year ago             | several formats behind             | every step since, in order, in memory; saved back current with the next save                                               | nothing                                              |
| two years ago          | at the edge of the chain           | the same, more steps                                                                                                       | nothing                                              |
| longer ago than that   | older than the oldest step shipped | not read: the page shows the team's layout, the old document is KEPT as it is, a notice says so; a batch brings it forward | a notice — never a silent reset, never a broken page |

## What there is (read from the code, 14 November 2026)

**What is stored, and by whom.** Five kinds of data outlive a release:

| Data                                              | Where it lives                                                           | Written            | How old it gets                       |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ | ------------------------------------- |
| Shared pages in the host's SOURCE                 | `pages/<page>/*.json` (doc/ADR/0011-pages-as-code.md)                    | with the code      | as old as the last edit of the page   |
| Shared pages and role layers saved by the builder | the host's persistence, through `save` (`SaveTrees`, `useCommit`)        | on Save page       | years                                 |
| A user's overlay (`userViewModels`)               | the host's persistence, one document per user                            | on the user's save | years; dormant users never rewrite it |
| Files in people's hands                           | a shared view (`wirework-page-view`), an exported page (`wirework-page`) | on Share / Export  | any age, and they arrive any day      |
| Browser conveniences                              | local storage (`wirework:columns:<rows path>`)                           | as the user works  | until the browser forgets             |

**Nothing stored says how old it is.** The two FILE formats carry
`version: 1` as a literal and anything else is refused
(`pageFileSchema`, `parsePageViewFile`); the trees themselves — what a host
actually keeps — carry nothing.

**The schemas are strict, on purpose.** A widget's view model is a strict
zod object (`defineContract`: "an unknown setting key is a config error,
never silently stripped"), and so is the user overlay. That rule is right
for catching typos and it decides what an incompatible change does today:

- a setting is REMOVED or RENAMED: every stored template that still has the
  old key is rejected — the cell shows a problem box (`invalid-view-model`).
  When the key sits in a user's own settings, the cell breaks FOR THAT USER
  ONLY and nothing tells them why;
- the overlay's own shape changes: the user's whole overlay fails the
  parse and is "ignored entirely" (`validate.ts`) — every view they made;
- a setting is ADDED with a default: nothing breaks. The trees store what
  was written and the defaults are filled in on every read
  (`checkTemplate`), so an old template simply gets the new default.

**That last line is a trap as well.** A default applies to every template
ever stored. This week's `cellSelection` (on), `columnMenu` (on) and
one-line cells (`wrapCells` off) each changed how every existing table
looks and behaves, with no change to any stored template. Compatible in
shape; a behaviour change in fact.

**Names are stored too.** A template holds a widget's type
(`antd-table`), setting keys, port and event names, action names with
their parameters (`table-view/load`), predicate names, appearance names,
toolbar item names, cell kinds, an engine's name, layout class names.
Each one is an API the day somebody saves it.

**Third-party shapes in stored data: one.** The contracts are zod and the
project's own words — tones, not antd's colours; dates as text, not dayjs
objects; grid placements and `grid-template-areas` of our own. The
exception is FlexLayout: a `flexlayout` page template stores the library's
own model document verbatim (`flexLayoutModelSchema`, passthrough — "the
library owns it"), and the library is at `0.11`, where a minor release may
change it. Second, of another kind: `@wirework/schema` reads zod's
internals to build the builder's forms, so zod is pinned exactly and is
part of what a host writes contracts against.

**The packages.** The sixteen published ones are all `0.1.0`, depend on each other with
`workspace:*`, are published with `pnpm -r publish`. There is no
changelog, no record of what a release changed, and no rule for what a
version number promises.

## The question, and five answers

How does data written by an old version stay good under a new one?

- **A. Never break.** Only additive changes, forever; no versions in data.
  Costs nothing and is what happens today. But a mistake in a contract is
  permanent, a default can never be corrected without changing everybody's
  pages, and a third-party format change (FlexLayout's model) cannot be
  absorbed at all.
- **B. Read tolerantly.** Drop strictness: strip what is not understood,
  default what is missing. Old data never fails — and silently loses
  meaning; a typo is no longer reported; a rename still cannot be followed.
  It trades a visible problem for an invisible one, against the rule the
  schemas were built on.
- **C. Mark the format, migrate on read.** A stamp in every stored
  document, a chain of pure functions in the packages, applied where data
  enters. What Grafana does with a dashboard's `schemaVersion`, what
  redux-persist and event-sourced systems do. Costs a stamp, a function
  per breaking change, and a corpus of old documents to test against.
- **D. Migrate at rest only.** A script the host runs over its database on
  every upgrade. The data is always current — where the script reached.
  It does not reach a file in somebody's mailbox, it needs the deploy and
  the script to happen together, and Wirework does not own the host's
  database.
- **E. Keep the old version alive.** A template records the version it was
  made with and the host loads that version of the widget; or a redesigned
  kind gets a new name beside the old one (`table`, `table-2`). Nothing is
  ever migrated — and every version ever shipped is shipped forever.

**Decision: C is the mechanism; A is the daily discipline; D is offered as
a tool made of C's own function; E's "a new kind beside the old one" is the
way out for a redesign no function can carry data across. B is refused for
anything a person built, and accepted for browser conveniences only.**

## The design

### 1. The format stamp

One optional key at the root of each stored document — `viewModels`,
`userViewModels`, a page file, a view file:

```json
{ "versions": { "wirework": 7, "app": 3 }, "pages": { … } }
```

- A number per OWNER of shapes. `wirework` is everything the standard
  packages own: the trees' own shape, the standard kinds' settings, the
  engines' templates, the standard action and predicate names. `app` is
  what the host registered: its own kinds, actions, predicates, paths. A
  third party's widget package names an owner of its own.
- An owner missing from the stamp is at format 1. So every document that
  exists today is valid as it is, and versioning starts without touching
  one of them.
- A user's overlay has its own stamp — it was written on another day than
  the shared page. Role layers live in `viewModels` and share its stamp.
- The files keep `version: 1` for their envelope (kind, page, name) and
  gain the same `versions` for what they carry.

Why per owner and not per widget kind, or one number: see Alexei, Dmitri
and Ren below.

### 2. A migration

A step declares WHERE it applies; the engine walks the trees, the step
never does. Proposed shape:

```ts
defineMigration({ owner: "wirework", to: 8, kind: "table", settings: rename("columnMenu", "columnTools") });
defineMigration({ owner: "wirework", to: 9, engine: "flexlayout", template: (template) => … });
defineMigration({ owner: "app", to: 4, action: rename("runs/overview", "runs/summary") });
```

Five places a step can apply, no more: a kind's SETTINGS, an engine's
TEMPLATE, a CELL (a widget type renamed), an ACTION call (its name, its
parameters), a PREDICATE. A change to the trees' own shape is a sixth, for
`@wirework/schema` alone.

Four rules every step keeps, each checked by a shared test helper:

1. **Pure.** Data in, data out; no store, no registry, no clock.
2. **Works on a part.** A user's settings for a cell are a sparse object —
   only the keys the user changed. A settings step must do right by
   `{}` and by one key alone, which is why the common cases are given as
   ready verbs (`rename`, `remove`, `mapValue`, `pinDefault`) and a free
   function is the exception.
3. **Idempotent.** Run on data that is already current, it changes
   nothing — so a document merged from parts of different ages, or read
   twice, is safe.
4. **One failure stays one failure.** A step that throws on one template
   leaves that template as it was, reported at its location
   (`pages.runs.default cell[1]: migration to format 8 failed: …`), and the
   rest of the document goes on. That cell then shows the problem box an
   invalid template shows today.

A contract carries its steps (`defineContract({ …, migrations })`), an
engine its own, a host registers the `app` chain beside its actions.

### 3. When it runs

- **On read, once, at the door.** One pure engine function —
  `upgradeTrees(trees, migrations)` returning the trees, whether anything
  changed and a report — called by the host where it loads its trees,
  before they reach the store. After the door, everything is current: the
  resolver, validation, the builder and every widget never see an old
  shape and contain no version checks.
- **On import.** A view file and a page file are upgraded by their own
  stamp before they are merged (`parsePageViewFile`, `mergePageFiles`).
- **Written back with the next save.** The commit path stamps what it
  writes. A host MAY persist at once when the function reports a change —
  recommended for the shared trees, unnecessary for a user's overlay.
- **As a batch, when the host wants.** The same function over every
  document in the host's database, in a script the host owns. And for the
  pages in source, a command that rewrites the page folders
  (`pnpm pages:upgrade`), run in the pull request that raises the
  packages, with the boot check failing a folder left behind.

### 4. Data from the future

A document stamped HIGHER than the code knows — a deployment rolled back,
two instances mid-deploy, a file from a colleague on a newer build:

- a user's overlay: not applied; the page shows the shared layout; the
  overlay's edit actions are LOCKED with a reason, as an edit without
  permission is today ("saved by a newer version of the application").
  It is never overwritten;
- the shared trees: the boot check fails, as for any invalid page;
- a file: refused on import with that reason.

No down-migrations: they are lossy by nature and double every step. In
their place one release rule — **a patch release never changes the data
format** — so the rollback that actually happens (a bad patch) is always
safe; a minor that changes the format says so at the top of its notes.

**This is the one part that cannot wait.** The reader that recognises a
stamp and refuses the future must be in the packages BEFORE the first host
keeps data. Code released without it meets a stamped overlay as an unknown
key, ignores the whole overlay, and the user's next save overwrites it.

### 5. Defaults, removals and redesigns

- **A default is part of the contract.** Changing one changes every stored
  template. Each such change is one of two things, and the changelog says
  which: a BEHAVIOUR CHANGE meant for everyone (one-line cells), or a new
  default for new templates only — then it ships with `pinDefault`, which
  writes the old value into the shared templates that never said
  otherwise. A user's sparse settings are left alone; they inherit.
- **A new setting without a default** is a breaking change and needs a
  step that gives old templates a value.
- **Removing or renaming** a setting, a kind, an action, a predicate goes
  through DEPRECATION first: the old name keeps working for at least one
  major, the boot report warns (`setting "x" of "table" is deprecated: use
"y"`), the builder marks it and stops offering it. Then it is removed,
  with a step to its replacement where there is one.
- **A redesign no step can carry data across** becomes a new kind beside
  the old one. The old kind is deprecated, not rewritten in place.

### 6. How long the chain is kept

Steps are a few lines each; keeping them is cheap and dropping one strands
somebody's data. So: never dropped within a major; a major may drop the
steps older than 24 months, and its notes say "bring data at rest forward
under the previous major first" — which the batch does. A document older
than the oldest step is reported as such, kept untouched, and never
half-migrated.

### 7. Package versions

- **One version for every `@wirework/*` package**, raised together, with
  exact dependencies between them — a host cannot mix an engine of one
  release with a schema of another, and "the format of release 1.6" means
  one thing. Changesets in its fixed mode: every pull request carries a
  small file saying what changed and how much; the release writes the
  changelog from them.
- **What a version promises** — the public API is five things:

  | Surface                                                                                        | Patch | Minor                                       | Major                                   |
  | ---------------------------------------------------------------------------------------------- | ----- | ------------------------------------------- | --------------------------------------- |
  | TypeScript exports                                                                             | fixes | additions                                   | removals, changed signatures            |
  | Stored data (trees, settings, engine templates, files)                                         | never | additive; or a format step WITH a migration | a kind removed; the chain's floor moved |
  | Names pages use (kinds, ports, events, standard actions, predicates)                           | never | additions; deprecations                     | removals                                |
  | What tests and themes read (`data-testid`, `data-*` facts, `ww-*` classes, `--ww-*` variables) | never | additions                                   | renames, removals                       |
  | Peer ranges (React, antd, zod, the layout libraries)                                           | never | widened                                     | a peer's major raised or dropped        |

- **Before 1.0** a minor may break, and the notes say so. 1.0 is cut when
  the first host outside the team goes to production.

### 8. The libraries underneath

- **The rule that already holds, now written:** no third-party shape in
  stored data and none in a contract. A widget converts at its own edge
  (dayjs in the date widgets, antd's names in `use-timeline.ts`). A review
  of a new widget checks it.
- **FlexLayout, the exception:** the engine package owns the model
  document as its template and therefore its migrations; the range becomes
  `~0.11` (a 0.x minor is a breaking release); every upgrade of the library
  runs the frozen models of every earlier format through the engine before
  it merges.
- **zod:** part of the public API — hosts write contracts with it and the
  schema package reads its internals. A zod major is a Wirework major,
  planned as a story of its own.
- **antd, React and the rest:** patch and minor updates arrive grouped,
  weekly, behind `pnpm check`. A major (antd 7) is a planned story; while
  both majors are supported the widgets run under each in CI. `e2e/support/antd.ts`
  stays the one place that knows antd's DOM, and a host's own tests are
  told to read Wirework's test ids, never antd's classes.
- **The range is tested at both ends:** one CI job with the lowest peer
  versions the packages claim, one with the newest.

### 9. Browser conveniences

Column state in local storage is read through its schema and falls back
to "nothing changed" when it does not fit. That stays, and is the policy
for everything of its kind: what the browser keeps for comfort may reset
on an upgrade and must never crash; what a person BUILT may not reset.

## How it is tested

- **A corpus of real documents, frozen per format.** At every format
  change a script copies today's documents — the demo pages' trees, a user
  overlay with views and cell settings, a view file, a page file, a
  FlexLayout model — into `fixtures/formats/<n>/`. They are never edited
  again. Format 1 is frozen NOW, before the first change.
- **One test over the corpus:** every document of every past format goes
  through the chain and then through the boot validation with no error.
  A step that breaks last year's data fails here, not at a customer.
- **The four rules** of a step, by one shared helper every migration's
  test calls.
- **A scenario in plain words** (`upgrades.feature`), which the manual
  testers can read and extend:

  ```gherkin
  Scenario: A view I saved under an older version opens as I left it
    Given my saved views of the "overview" page are from data format 1
    When I open the "overview" page
    Then the page uses the "my-own" view, which is "mine"
    And no widget has crashed

  Scenario: A view saved by a newer version is kept, not overwritten
    Given my saved views of the "overview" page are from a newer data format
    When I open the "overview" page
    Then the page uses the "default" view, which is "prebuilt"
    And my own views cannot be edited: "saved by a newer version of the application"
  ```

- **A guard on the contracts.** Each contract's settings as a committed
  JSON Schema (the catalog WW-33 generates). A pull request that changes
  one fails until it carries a changeset; a change that is not additive
  fails until it carries a migration.

## The tiger team's positions

- **Morgan (product):** three promises to a user, in this order: my page
  never breaks because the application was updated; what I built is never
  thrown away without telling me; I do nothing to be upgraded. The table
  at the top is the acceptance. One request: when a default changes what
  every table looks like, the release notes say it in a sentence a
  customer can read — this week's three would each have earned one.
- **Alexei (architecture):** one door. Old shapes exist in exactly one
  function and the corpus; a version check anywhere else is a defect.
  Argued for a version per CONTRACT — each contract owns its shape, so it
  should own its number. Gave way on the stamp (a map of thirty-two
  numbers in every user's document, for packages that are released
  together anyway), kept the ownership: the steps live with the contract
  and the engine they change.
- **Dmitri (readability):** wanted ONE number — "format 8" is something a
  support engineer can say on the phone. Accepted two (`wirework`, `app`)
  because a host's own contracts change on the host's calendar and cannot
  share a line with the library's. Insisted on the ready verbs: a
  migration a junior reads in thirty seconds is `rename("a", "b")`, not a
  function walking a tree. And no "smart" tolerant parsing — a strict
  schema and a visible step.
- **Katya (team lead):** the daily rule is the product: "additive, with a
  default; anything else carries a changeset and a migration" fits in a
  pull-request template, and the contracts guard enforces it so nobody
  has to remember. Lockstep versions: one number to tell a host. The
  batch is a function, not a service — hosts own their databases.
- **Sasha (QA):** the frozen corpus is the feature; without it a migration
  is tested against data its author imagined. Format 1 must be frozen this
  week — after the first breaking change it cannot be recreated honestly.
  The test ids and `data-*` facts are API: the suite of every host is
  written against them. Two scenarios in plain language so the manual
  testers can check an upgrade on a staging copy of real data — and a
  staging run of the batch over a copy of production before every release
  that changes the format.
- **Ren (contrarian):** three challenges. (1) "Do we need this at all?
  Nothing has broken." — Nothing has been removed yet, and the day
  something is, the strict schemas turn it into broken cells for one user
  at a time, which is the worst kind of bug to hear about. But the
  challenge is half right: see the phases — the chain is built when the
  first non-additive change is wanted, not before. (2) "Migrate-on-read
  means the code carries every past forever." — hence the floor, and the
  batch that lets a host move it. (3) "The rollback story is weak." —
  conceded: after a format change is saved, the older build is locked out
  of that data. Down-migrations were weighed and refused; the patch rule
  is what is offered, and the risk is named: a MINOR that changes the
  format should sit a week on staging before production. Ren also named
  what to watch: the `app` chain is written by hosts, and a host's bad
  step corrupts that host's data — the helper and the corpus must be as
  easy for a host to use as for us.
- **Vlad (fluency):** the chain is one fold — the steps after the stamp,
  in order, reduced over the document — and a step is one expression made
  of the verbs. If a migration needs a loop, the shape it migrates was
  wrong.
- **The external reviewer:** the least code that keeps the promise. The
  reader of the stamp and the lock for the future are small and cannot be
  added later — build them. The chain, the verbs and the command for page
  folders wait for the first change that needs them; until then the
  contracts guard holds the line at "additive only". Five places a step
  may apply is the ceiling, not a list to implement on day one.

## Consequences

- An upgrade of the packages needs no action from a user and none from a
  host beyond installing it; a host with pages in source runs one command
  in the same pull request.
- A contract can be corrected. Today a wrong name is permanent.
- Every non-additive change costs its author a step, a corpus freeze and
  a line in the changelog — deliberately: it is the price of breaking
  somebody's stored page, paid once by us instead of by each host.
- After a format-changing release has been used, rolling back to the
  build before it locks editing of the data saved since. Accepted, named
  in the release notes.
- The host gets two new duties: call the upgrade where it loads its
  trees, and keep the `versions` key when it stores them.

## Phases

1. **Policy and the baseline (no engine code).** This record; Changesets
   in fixed mode and the first changelog; the pull-request rule "additive
   only"; the contracts guard; format 1 frozen as the corpus; FlexLayout's
   range to `~0.11`; the two CI jobs at the ends of the peer ranges.
2. **The stamp and the door.** `versions` in the trees and the files; the
   upgrade function with an empty chain; the commit path stamping what it
   saves; the lock and the refusal for data from the future; the two
   scenarios. Must ship before the first host keeps data.
3. **The chain, with the first change that needs it.** `defineMigration`,
   the verbs, the corpus test, the batch recipe, `pnpm pages:upgrade`,
   deprecation warnings in the boot report and the builder.

## For the owner to decide

1. The stamp per owner (`wirework`, `app`) — the team's choice — or per
   widget kind (Alexei's first position).
2. The floor: 24 months of steps kept. Longer costs little; shorter saves
   almost nothing.
3. Whether a host persists an upgraded user overlay at once or with the
   user's next save (the team: next save; at once for the shared trees).
4. No down-migrations, and the patch rule in their place.
5. When 1.0 is cut — the team: with the first host in production outside
   the team.

## Built (14 November 2026): the stamp, the door and the chain

- **The stamp (`@wirework/schema`, `models/versions.ts`).** `versions` — a
  number per owner, `formatStampSchema` — is an optional key at the root of
  the view models, the user overlay and the page file (and so of a page
  folder's `page.json`); the view file carries it too. `WIREWORK_OWNER`,
  `APP_OWNER`. Absent = format 1: no stored document changed.
- **The steps and the door (`@wirework/engine`, `migrations.ts`).**
  `defineMigration` for FOUR places — a kind's `settings`, an engine's
  `template`, a `cell`, an `action` call; `createMigrations({ oldest })`
  with `current()` (the newest step per owner) and `oldest()` (the floor);
  the verbs `rename`, `remove`, `mapValue`, `pinDefault`, `renameWidget`,
  `renameAction`; `upgradeTrees({ viewModels, userViewModels }, {
migrations, registry })` returning the trees stamped, `changed`,
  `problems` (a failed step, at its place) and `unread` (a document handed
  back untouched, with the reason); `stampProblem` and `stamped`.
- **How the door finds things.** It walks the trees STRUCTURALLY — a cell
  is any object with an id, a widget, a model and a template — and never
  through the engines' validators: an old template would not pass today's.
  A template's kind is its cells' widget's, read through every rename
  still to come (the registry knows today's types only). An overlay's
  sparse settings are matched by the cell's id, the last step of their key.
- **Data this version cannot read.** `checkOverlay` and `resolvePage` take
  the formats (`migrations`, on `ResolveInput`, `validateViewModels`,
  `PageView`, `usePageEditing`): an overlay saved by a newer version is
  ignored with the reason on the plan (`overlay-ignored` on the page) and
  is a boot error; pages saved by one are a page problem. WITHOUT a
  registry every owner is at format 1 and any stamp above it is refused —
  the reader that cannot wait is the default.
- **The write path (`@wirework/builder`).** `commitTrees` / `useCommit`
  take `migrations`: every tree committed is stamped with what this
  version writes, and a commit that would write over a tree this version
  cannot read is refused whole and reported through `onError`. `EditLock`
  gained `"newer-data"`. A view file says its format when shared; on
  Import an older one goes through the door (`usePageViews`' `door`), a
  newer one is refused.
- **Page files.** `pageFile` writes the tree's stamp; `mergePageFiles`
  makes a tree with the files' stamp and reports files of different
  formats as a problem — a host merges a file alone, upgrades, then merges
  trees.
- **The demo.** The playground has a `migrations` registry among its
  registries and one step of its own — `app` format 2: the widget type
  `run-badge` is `status-badge`. `boot.ts` is the door: a page's folder
  when the page opens, the user's saved views (read WITH every page's view
  models) when the session opens. With the overlay on and the saved views
  unreadable, Edit page is locked with the reason.
- **Tested.** `migrations.test.ts` — twenty tests over a FROZEN CORPUS
  (`packages/engine/src/__tests__/formats/<n>/`: the test suite's own small
  application at formats 1 and 2), every document through the door and
  then through the boot validation against today's widgets; the builder's
  commit and view-file tests; `upgrades.feature` — three scenarios over
  `e2e/fixtures/formats/1/saved-views.json`, a user's views as the demo
  stored them at format 1.
- **Departures from the design.** Four places a step applies, not six: a
  PREDICATE rename and a change of the trees' OWN shape have no step yet.
  A contract and an engine do not carry their steps
  (`defineContract({ migrations })`): a host registers every step in one
  registry, beside its actions. The corpus is the test suite's own
  application plus one saved document of the demo's, not copies of the
  demo's pages — the page folders in `apps/playground/src/pages` go through
  the door at every boot, which is their test. FlexLayout's range needed
  no change: for a `0.x` version a caret range already stops at the next
  minor (`^0.11.0` is `<0.12.0`).
- **Not built.** The release tooling of phase 1: Changesets and lockstep
  versions, a changelog, the guard on contract changes, the CI jobs at
  both ends of the peer ranges. Of phase 3: `pnpm pages:upgrade` for the
  page folders in source, deprecation warnings in the boot report and the
  builder, a batch recipe for a host's database. The state panel does not
  show a tree's stamp. Persisting an upgraded tree is the host's call
  (`changed`); the demo keeps nothing.
