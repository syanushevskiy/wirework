# ADR-0017: Versions and upgrades — the packages, the libraries under them, and stored templates of any age

- **Status:** Accepted — the data format built (the stamp, the door, the chain); the release tooling not
- **Deciders:** the product owner

## 1. Decision

Every stored document carries a format stamp per owner
(`versions: { wirework, app }`; absent = format 1). The packages carry a
chain of small pure migrations, applied WHEN DATA IS READ at one door
(`upgradeTrees`) and written back current with the next save. Data from a
NEWER format is never guessed at and never overwritten. An optional
setting with a default needs none of this. Built: the stamp, the door, the
chain. Not built: the release tooling. Five points for the owner are open.

## 2. Problem

Wirework is published as packages, sits on third-party libraries (antd,
FlexLayout, gridstack, react-grid-layout, zod, React) and its users STORE
what they build with it. A host upgrades the packages; the data was
written by whatever version was installed that day. Three questions:

1. How are the packages versioned, and what counts as a breaking change?
2. How are the libraries underneath updated without the update reaching
   what people stored?
3. A template made two years ago, a year ago, a week ago: what happens to
   each when the application is upgraded?

What is stored, and how old it gets:

| Data                                              | Where it lives                                                           | How old it gets                       |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- |
| Shared pages in the host's SOURCE                 | `pages/<page>/*.json` (ADR-0011)                                         | as old as the last edit of the page   |
| Shared pages and role layers saved by the builder | the host's persistence (`SaveTrees`, `useCommit`)                        | years                                 |
| A user's overlay (`userViewModels`)               | the host's persistence, one document per user                            | years; dormant users never rewrite it |
| Files in people's hands                           | a shared view (`wirework-page-view`), an exported page (`wirework-page`) | any age, and they arrive any day      |
| Browser conveniences                              | local storage (`wirework:columns:<rows path>`)                           | until the browser forgets             |

The schemas are strict on purpose (an unknown setting key is a config
error). So a setting REMOVED or RENAMED turns every stored template that
holds the old key into a problem box — for one user only when the key sits
in their own settings — and a change of the overlay's shape loses the
user's whole overlay. A setting ADDED with a default breaks nothing:
defaults are filled in on every read. That is a trap as well: a default
applies to every template ever stored, so a new default changes existing
pages with no stored template changing.

Names are stored too — a widget's type, setting keys, ports, events,
action and predicate names, an engine's name, layout class names. Each is
an API the day somebody saves it.

## 3. Details

Three promises to a user, in this order: my page never breaks because the
application was updated; what I built is never thrown away without telling
me; I do nothing to be upgraded.

| The template was saved | On the first visit after an upgrade                                                                                        | What the user notices                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| a week ago             | nothing, or one step                                                                                                       | nothing                                              |
| a year ago             | every step since, in order, in memory; saved back current with the next save                                               | nothing                                              |
| two years ago          | the same, more steps                                                                                                       | nothing                                              |
| longer ago than that   | not read: the page shows the team's layout, the old document is KEPT as it is, a notice says so; a batch brings it forward | a notice — never a silent reset, never a broken page |

### The format stamp

One optional key at the root of each stored document — `viewModels`,
`userViewModels`, a page file (and so a page folder's `page.json`), a view
file:

```json
{ "versions": { "wirework": 7, "app": 3 }, "pages": { … } }
```

- A number per OWNER of shapes (`formatStampSchema`, `WIREWORK_OWNER`,
  `APP_OWNER` in `@wirework/schema`, `models/versions.ts`). `wirework` is
  what the standard packages own: the trees' shape, the standard kinds'
  settings, the engines' templates, the standard action and predicate
  names. `app` is what the host registered. A third party's widget package
  names an owner of its own.
- An owner missing from the stamp is at format 1, so every document stored
  without a stamp is valid as it is.
- A user's overlay has its own stamp. Role layers live in `viewModels` and
  share its stamp.
- The files keep `version: 1` for their envelope and carry `versions` for
  what they hold.

### A migration step

A step declares WHERE it applies; the engine walks the trees, the step
never does (`@wirework/engine`, `migrations.ts`):

```ts
defineMigration({ owner: "wirework", to: 8, kind: "table", settings: rename("columnMenu", "columnTools") });
defineMigration({ owner: "wirework", to: 9, engine: "flexlayout", template: (template) => … });
```

- FOUR places, one per step: a kind's `settings` (`kind` + `settings`), an
  engine's `template` (`engine` + `template`), a `cell` (a widget type
  renamed), an `action` call.
- The verbs: `rename`, `remove`, `mapValue`, `pinDefault`, `renameWidget`,
  `renameAction`. A step is one expression made of them; a free function
  is the exception. If a migration needs a loop, the shape it migrates was
  wrong.
- `createMigrations({ oldest })` is the registry, with `current()` (the
  newest step per owner) and `oldest()` (the floor). A host registers
  every step in ONE registry, beside its actions.

Four rules every step keeps:

1. **Pure.** Data in, data out; no store, no registry, no clock.
2. **Works on a part.** A user's settings for a cell are sparse — only the
   keys the user changed. A settings step must do right by `{}` and by one
   key alone.
3. **Idempotent.** On data already current it changes nothing, so a
   document merged from parts of different ages, or read twice, is safe.
4. **One failure stays one failure.** A step that throws on one template
   leaves that template as it was, reported at its location; the rest of
   the document goes on.

### The one door

`upgradeTrees({ viewModels, userViewModels }, { migrations, registry })`
returns the trees stamped, `changed`, `problems` (a failed step, at its
place) and `unread` (a document handed back untouched, with the reason).
The chain is one fold: the steps after the stamp, in order.

- A host calls it where it loads its trees, before they reach the store.
  After the door everything is current: the resolver, validation, the
  builder and the widgets never see an old shape. **A version check
  anywhere else is a defect.**
- It walks the trees STRUCTURALLY — a cell is any object with an id, a
  widget, a model and a template — never through the engines' validators:
  an old template would not pass today's. A template's kind is its cells'
  widget's, read through every rename still to come. An overlay's sparse
  settings are matched by the cell's id, the last step of their key.
- Written back with the next save: `commitTrees` / `useCommit` take
  `migrations` and stamp every tree they write. Persisting at once when
  `changed` is true is the host's call — recommended for the shared trees,
  unnecessary for a user's overlay.
- Files: `pageFile` writes the tree's stamp. `mergePageFiles` makes a tree
  with the files' stamp and reports files of different formats as a
  problem — a host merges a file alone, upgrades, then merges trees. A
  view file says its format when shared; on Import an older one goes
  through the door (`usePageViews`' `door`).
- In the playground `boot.ts` is the door: a page's folder when the page
  opens, the user's saved views (read WITH every page's view models) when
  the session opens.

### Data this version cannot read

A document stamped NEWER than the code reads (a rollback, two instances
mid-deploy, a file from a newer build), or older than `oldest`, is not
read: `stampProblem` gives the reason (`stamped` reads a stamp).

- **A user's overlay**: ignored, with the reason on the plan
  (`overlay-ignored` on the page) and as a boot error; the page shows the
  shared layout. With the overlay on, Edit page is locked (`EditLock`
  `"newer-data"`). It is never overwritten.
- **The shared pages**: a page problem and a boot error.
- **A file**: refused on import with the reason.
- **The write path**: a commit that would write over a tree this version
  cannot read is refused whole and reported through `onError`.
- **Without a `migrations` registry** every owner is at format 1 and any
  stamp above it is refused — the reader that refuses the future is the
  default. It must be in the packages before a host keeps data: code
  without it meets a stamped overlay as an unknown key, ignores it, and
  the user's next save overwrites it.

`checkOverlay`, `resolvePage` (`ResolveInput.migrations`),
`validateViewModels`, `PageView` and `usePageEditing` take the formats.

No down-migrations: they are lossy and double every step. In their place
one release rule — **a patch release never changes the data format** — so
the rollback that actually happens (a bad patch) is safe. A minor that
changes the format says so at the top of its notes.

### What change needs a step

- **Additive needs none**: an optional setting with a default is
  compatible.
- **Not additive needs a step** — a setting renamed or removed, a new
  setting without a default, a default changed for new templates only, a
  widget type or an action renamed. With the step go a new folder in the
  frozen corpus and a line under "The chains" below.
- **A default is part of the contract.** Changing one is either a
  BEHAVIOUR CHANGE meant for everyone, said in the release notes in a
  sentence a customer can read, or a new default for new templates only —
  then it ships with `pinDefault`, which writes the old value into the
  shared templates that never said otherwise. A user's sparse settings are
  left alone; they inherit.
- **A redesign no step can carry data across** is a new kind beside the
  old one. The old kind is deprecated, not rewritten in place.
- **How long the chain is kept**: never dropped within a major. A major
  may drop the steps older than 24 months, and its notes say "bring data
  at rest forward under the previous major first". A document older than
  the oldest step is reported, kept untouched, never half-migrated.

### The chains

- `wirework`: format 1, no step.
- `app` (the demo): format 2 — the widget type `run-badge` is
  `status-badge`.

### How it is tested

- **A frozen corpus per format**: real documents in
  `packages/engine/src/__tests__/formats/<n>/` (the test suite's own small
  application), never edited after they are frozen; for the demo
  `e2e/fixtures/formats/<n>/saved-views.json`, a user's views as stored at
  that format. Without it a step is tested against data its author
  imagined.
- `migrations.test.ts`: every document of every past format goes through
  the door and then through the boot validation against today's widgets.
- The builder's commit and view-file tests; `upgrades.feature`.
- The page folders in `apps/playground/src/pages` go through the door at
  every boot, which is their test.

### Browser conveniences

Column state in local storage is read through its schema and falls back to
"nothing changed" when it does not fit. That is the policy for everything
of its kind: what the browser keeps for comfort may reset on an upgrade
and must never crash; what a person BUILT may not reset.

### The libraries underneath

- **No third-party shape in stored data and none in a contract.** A widget
  converts at its own edge (dayjs in the date widgets, antd's names in
  `use-timeline.ts`).
- **FlexLayout is the one exception**: a `flexlayout` template stores the
  library's own model document, so the engine package owns its migrations.
  The range `^0.11.0` already stops at the next minor (for `0.x` a minor
  is a breaking release). Every upgrade of the library runs the frozen
  models of every earlier format through the engine before it merges.
- **zod** is part of the public API — hosts write contracts with it and
  the schema package reads its internals. A zod major is a Wirework major.
- **antd, React and the rest**: patch and minor updates arrive grouped,
  weekly, behind `pnpm check`. A major is a planned story; while both
  majors are supported the widgets run under each in CI.
  `e2e/support/antd.ts` stays the one place that knows antd's DOM, and a
  host's tests read Wirework's test ids, never antd's classes.

### Package versions

The policy; its tooling is not built.

- **One version for every `@wirework/*` package**, raised together, with
  exact dependencies between them, so "the format of release 1.6" means
  one thing.
- **What a version promises** — the public API is five surfaces:

  | Surface                                                                                        | Patch | Minor                                       | Major                                   |
  | ---------------------------------------------------------------------------------------------- | ----- | ------------------------------------------- | --------------------------------------- |
  | TypeScript exports                                                                             | fixes | additions                                   | removals, changed signatures            |
  | Stored data (trees, settings, engine templates, files)                                         | never | additive; or a format step WITH a migration | a kind removed; the chain's floor moved |
  | Names pages use (kinds, ports, events, standard actions, predicates)                           | never | additions; deprecations                     | removals                                |
  | What tests and themes read (`data-testid`, `data-*` facts, `ww-*` classes, `--ww-*` variables) | never | additions                                   | renames, removals                       |
  | Peer ranges (React, antd, zod, the layout libraries)                                           | never | widened                                     | a peer's major raised or dropped        |

- **Before 1.0** a minor may break, and the notes say so.

### Not built

- **Release tooling**: Changesets in fixed mode (every pull request
  carries a small file saying what changed and how much; the release
  writes the changelog from them) and lockstep versions; the pull-request
  rule "additive, with a default; anything else carries a changeset and a
  migration"; a GUARD on the contracts — each contract's settings as a
  committed JSON Schema (the catalog of ADR-0014), a pull request that
  changes one failing until it carries a changeset, a non-additive change
  until it carries a migration; two CI jobs, one with the lowest peer
  versions the packages claim and one with the newest.
- **Steps** for a PREDICATE rename and for a change of the trees' OWN
  shape (`@wirework/schema` alone). A contract or an engine carrying its
  own steps (`defineContract({ migrations })`).
- **`pnpm pages:upgrade`**: rewrites the page folders in source, run in
  the pull request that raises the packages, the boot check failing a
  folder left behind.
- **Deprecation**: a removed or renamed setting, kind, action or predicate
  keeps working under its old name for at least one major; the boot report
  warns (`setting "x" of "table" is deprecated: use "y"`), the builder
  marks it and stops offering it; then it is removed, with a step to its
  replacement.
- **A batch recipe** for a host's database — the same function over every
  document, in a script the host owns — and a staging run of it over a
  copy of production before a release that changes the format.
- The state panel does not show a tree's stamp. The demo persists nothing.

### For the owner to decide

1. The stamp per owner (`wirework`, `app`) — what is built — or per widget
   kind.
2. The floor: 24 months of steps kept. Longer costs little; shorter saves
   almost nothing.
3. Whether a host persists an upgraded user overlay at once or with the
   user's next save (this record: next save; at once for the shared
   trees).
4. No down-migrations, and the patch rule in their place.
5. When 1.0 is cut — this record: when the first host outside the team
   goes to production.

## 4. Options weighed

How does data written by an old version stay good under a new one?

| Option                                 | Verdict                                                                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Never break (additive only)         | The daily discipline, not the mechanism: alone, a mistake in a contract is permanent, a default can never be corrected, and a third-party format change (FlexLayout's model) cannot be absorbed.     |
| B. Read tolerantly (strip and default) | Refused for anything a person built: old data never fails and silently loses meaning, a typo is no longer reported, a rename still cannot be followed. Accepted for browser conveniences only.       |
| C. Mark the format, migrate on read    | Chosen as the mechanism — what Grafana does with a dashboard's `schemaVersion`. Costs a stamp, a function per breaking change and a corpus of old documents.                                         |
| D. Migrate at rest only                | Offered as a tool made of C's own function. Alone it does not reach a file in somebody's mailbox, needs the deploy and the script to happen together, and Wirework does not own the host's database. |
| E. Keep the old version alive          | Only its "a new kind beside the old one" is taken, for a redesign no function can carry data across. Otherwise every version ever shipped is shipped forever.                                        |

The stamp: a number per contract was weighed and refused — a map of
thirty-two numbers in every user's document, for packages released
together anyway. One number for everything was refused too — a host's
contracts change on the host's calendar. Hence two owners.

Risks and trade-offs:

- **"Nothing has broken, so nothing is needed."** Nothing has been removed
  yet; the day something is, the strict schemas turn it into broken cells
  for one user at a time. The reader of the stamp and the lock for newer
  data are small and cannot be added later, so they exist first; a step is
  written only when a non-additive change is wanted.
- **Migrate-on-read means the code carries its past** — hence the floor,
  and the batch that lets a host move it.
- **Rollback is the weak point.** After a format change is saved, the
  older build is locked out of that data; it is named in the release
  notes. A MINOR that changes the format should sit a week on staging
  before production.
- **The `app` chain is written by hosts.** A host's bad step corrupts that
  host's data: the corpus and the test of the four rules must be as easy
  for a host to use as for the packages.

Consequences:

- An upgrade needs no action from a user, and none from a host beyond
  installing it.
- A contract can be corrected; without the chain a wrong name is
  permanent.
- Every non-additive change costs its author a step, a corpus freeze and
  a line in the changelog — the price of breaking somebody's stored page,
  paid once instead of by each host.
- The host has two duties: call the door where it loads its trees, and
  keep the `versions` key when it stores them.
