# ADR-0019: Security — who is trusted with what, and the vulnerabilities found in the eighteen records

- **Status:** Proposed — a review; nothing fixed
- **Date:** 2026-11-14
- **Deciders:** the product owner

## Description

Wirework has no security design: each record decided its own piece. This
review reads all of them and says where the pieces leave a hole.

Reviewed 14 November 2026: every record in this folder
(0001–0018) was read for what it decides, and every candidate weakness was
then looked for in the code. A finding below names the file and the line
that carries it. **Nothing was executed**: "confirmed" means confirmed by
reading the code path, not by running an attack — the three places where
the conclusion rests on how a browser or a library behaves say so.

Two sentences a customer's security reviewer will ask for, and today
neither can be given: "what can a user of the application do that they
should not" and "what must our server check". The table of who is trusted
with what answers them, and is the first deliverable, before any fix.

## Options considered

This record is a review, not a choice between designs: it lists findings,
a fix for each, and the phases to fix them in. Where it did weigh
alternatives, they are these.

- **How to close finding 1.** A user's own layout restricted to the cells
  the page's shared layout holds — proposed. A user cannot then add a
  widget to their view at all; ADR-0003 already forbade that, so nothing
  is lost. But a ROLE's view adds cells on purpose (ADR-0012), and roles
  are written by page authors: the rule is for the USER's overlay and for
  files, not for role layers. The alternative, users allowed to place
  widgets from a list the host offers, is the second point for the owner.
- **A cleverer scheme — signed templates, capability tokens.** Refused:
  nobody would read it. Every fix here is a rule that fits in a line — "an
  address is checked by resolving it", "a file writes under its own page",
  "a control's template says its kind".
- **Findings 2 and 3 fixed inside this record, or by a design of their
  own.** They need ADR-0005's `scope` built; they are not improvised here
  (phase 3).
- **Other roles' pages in the browser (finding 7).** Keep sending every
  role's entry and document it, or have the host send each session its
  own: open, the third point for the owner.
- **The CSV export (finding 6).** Formulas neutralised by default, with a
  setting to turn it off — proposed —, or only as a setting: the fourth
  point for the owner.
- **The order.** Finding 1 first: it is the one where the records' own
  words were wrong. The least code that closes the most is five small
  changes, none above fifty lines: the template's kind and the
  overlay-layout rule (1), protected roots (7), the address check (4), the
  page file's paths (5), the CSV apostrophe (6).

## Decision

Proposed; nothing is fixed by this record. What is decided so far is the
review itself: the table of who is trusted with what, the fourteen
findings with a fix proposed for each, and the four phases to fix them in.
The five points under "For the owner to decide" are open.

What the review found, in short:

- **No way was found to run script**: no markup sink, no `eval`, no
  configuration that chooses code to load; paths and merges refuse
  prototype segments; a table's row data cannot become a link target.
- **The largest hole is an invariant that no longer holds.** The engine
  promises that a user's own view "carries settings, never wiring". Since
  a user's view may hold whole LAYOUTS (their own page templates, their own
  layout inside a card), a user can place ANY registered widget over ANY
  existing widget template — and a template written to SHOW a value becomes
  one that WRITES it. On the demo that is three lines of JSON to give
  oneself the `admin` role in the browser (finding 1).
- **Everything a page author writes runs as whoever opens the page.** Any
  registered action can be wired to any event, including a page's own
  `load`; a table can be told to talk to any address (findings 2, 3).
- **Permissions and roles are facts in the browser.** They are data in the
  store that a reaction may write; every role's configuration is sent to
  every user. This is by design — the SERVER decides — but nothing in the
  packages makes a host do that, and no record says it in one place
  (finding 7).
- Fourteen findings in all: one high, six medium, the rest low; two more
  concern designs not built yet. None is fixed by this record.

| #   | Finding                                                                           | Severity | Who can use it                            |
| --- | --------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| 1   | A user's own layout places any widget over any template: a read becomes a write   | High     | any user; a shared view file              |
| 2   | Any action on any event, as the viewer (confused deputy)                          | Medium   | a page author; a page file                |
| 3   | A table loads from any URL, into any store path                                   | Medium   | a page author; a page file                |
| 4   | "An address of the application" accepts a tab: a link leaves the origin           | Medium   | a page author; a page file                |
| 5   | A page file writes anywhere in the tree when merged                               | Medium   | whoever sends a page file                 |
| 6   | The CSV export writes live spreadsheet formulas                                   | Medium   | anyone whose text reaches a table row     |
| 7   | Permissions and roles are writable store data; all roles' pages reach all users   | Medium   | a page author; any user through finding 1 |
| 8   | "Newer data is never overwritten" holds for one browser tab only                  | Low–Med  | a second tab, a rolling deploy            |
| 9   | An input's `pattern` is a regular expression from configuration (freezes the tab) | Low–Med  | a page author; a page file                |
| 10  | A table setting names any localStorage key to overwrite                           | Low      | a page author                             |
| 11  | FlexLayout's own document passes unchecked — a tracking image in a shared view    | Low–Med  | whoever sends a view file                 |
| 12  | A cell may leave its box and cover the application                                | Low      | any user's view; a shared view file       |
| 13  | No limits on the size or depth of what is imported or stored                      | Low      | whoever sends a file; a stored document   |
| 14  | Smaller ones: a dialog that cannot close, error text shown as is, and five more   | Low–Info | —                                         |

## Who is trusted with what

The records assume these without saying them. Written down, they are the
security model the findings are measured against.

| Who                                                | May                                                                        | Must not be able to                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **The host's developers** (code: widgets, actions) | everything                                                                 | —                                                                               |
| **The server**                                     | decide every permission and every row                                      | be bypassed: the browser is never the judge                                     |
| **A page author** (the builder, `editPages`)       | lay out pages, bind widgets, wire reactions to the actions offered to them | reach an action or an address the host did not offer; act as the person viewing |
| **A user** (their own overlay)                     | rearrange, choose views, change settings — for themselves                  | bind, wire, write data the page never wrote, see or do what their role does not |
| **A file from somebody else** (a view, a page)     | be read as data, checked, and refused                                      | carry more than its kind says: a view is a layout, a page file is one page      |
| **A server's answer** (rows, columns)              | be shown as text                                                           | choose a link's target, a cell's kind, markup                                   |
| **Another tab, an older build**                    | read                                                                       | overwrite what it did not load                                                  |

Findings 1, 7 and 12 break the USER's row; 2, 3, 4, 9 and 10 the PAGE
AUTHOR's; 5, 11 and 13 the FILE's; 6 the SERVER ANSWER's; 8 the last one.

## The findings

### 1. A user's own layout places any widget over any template — High

**The records.** ADR-0003: a user's view "cannot rebind a widget, call an
action or write a data path the page never declared". ADR-0006 gave the
user their own page templates; ADR-0009 their own layout inside a card,
kept as the card's `content` SETTING in their overlay; ADR-0012 the same
shape to roles.

**The code.** The overlay's settings may not hold the keys `inputs`, `on`,
`when` (`packages/schema/src/models/user-view-models.ts:28-32`) — but they
may hold a layout, and a user's `templates` are whole page templates
(`:55`). A cell is three free strings: a widget, a model path, a template
name (`models/page-template.ts:16-35`). Resolution looks the widget up in
the registry and the template in the tree as two independent things
(`packages/engine/src/resolve.ts`, `resolveCell`); nothing says which KIND
a template was written for. The cells of a layout inside a container are
resolved and their reactions BOUND like any others
(`packages/react/src/useNestedLayout.ts:72`, `:86-98`). And a control's
event writes back to whatever path its port is bound to, by default
(`packages/engine/src/reactions.ts:59-67`).

**What follows.** The demo's cards page shows the session's roles with an
echo: `{ "inputs": { "value": "app.user.roles" }, "label": … }`
(`apps/playground/src/pages/cards/widgets.json:108-114`). That template is
also a valid `multi-select` (`packages/widget-contracts/src/multi-select.ts`:
a `value` port holding a list of strings, a `label`, `changed` written back
to `value`). A user's own view with one cell —
`{ "widget": "antd-multi-select", "model": "widgets.cards.sessionRoles", "template": "default" }`
— and, as an ordinary setting, `options: [{ "value": "admin" }]`, is a
dropdown that writes `app.user.roles`. The page is then read through the
admin's layer (`apps/playground/src/hooks/use-playground.ts`, the roles
from `app.user.roles`). The same way a user places another role's button
in their own view — the admin's "reset every setting", whose action checks
nothing (`apps/playground/src/demo/install.ts`, `settings/reset-all`).
A shared view file carries a layout, so a colleague can send one.

**How bad.** In the browser, complete: roles, conditions and role views
stop meaning anything. On a host whose server checks every request, the
user sees admin screens with refused requests. On a host that trusts the
page — and nothing tells it not to — it is privilege escalation.

**Fix.** Two rules, both in resolution so no caller can skip them: a
template map records the KIND it was written for (the builder writes it;
for old data, the kind of the cell that first pointed at it) and a cell of
another kind is a cell problem; and a layout that an OVERLAY owns — a
user's or role's template, a `content` setting — may hold only cells whose
(id, widget, model) the page's shared layout holds for that container.

### 2. Any action on any event, as the viewer — Medium

ADR-0005 says "user configuration only picks names and parameters" and
lists `scope` and per-page offering as not built. So every registered
action is offered to every page author, for every event: the handler gets
the event, the store and the arguments — no page, no caller
(`packages/engine/src/reactions.ts:144`), and resolution only asks whether
the action exists. A table's and a page's `load` fire by themselves. A
page author who is not an admin wires `runs/delete-selected` to the `load`
of a shared page; it runs under the session of the admin who opens it.

**Fix.** Build ADR-0005's `scope`. An action declares what it is —
`destructive`, `needs a gesture` — and resolution refuses a destructive
one on `load` and on any event that is not a person's click; the builder
offers an author only the actions their own roles may wire.

### 3. A table loads from any URL, into any store path — Medium

`table-view/load` takes `url: z.string().min(1)`
(`packages/table-view/src/view.ts:48`) and posts to it
(`api.ts:72`); `into` is any string (`loader.ts`). ADR-0005 meant its
HTTP action to be "restricted to relative URLs"; the one built is not. A
page can send what a user filters and searches by to another origin and
show the rows that origin answers with; or post, with the user's cookies,
to any endpoint of the application itself. `into: "app.user"` writes the
loader's fields into the session's data. The declared view is then read
back from the store (`<into>.view`), where any reaction may have changed
its URL.

**Fix.** `url` is an address of the application (finding 4's check) or one
of the prefixes the host's transport allows; `into` is a data path outside
the protected roots (finding 7); the view is kept where reactions cannot
write, or checked against the declaration on every request.

### 4. "An address of the application" accepts a tab — Medium

`appPathSchema` is `/^\/(?![/\\])/` (`packages/widget-contracts/src/table-cell.ts:24`):
it looks at the second character only. A browser drops tabs and line
breaks when it reads a URL, so `"/\t/evil.example/x"` passes and leads to
`//evil.example/x`. The same check guards a link cell's `to`, the
`follow` decision (`use-table-rows.ts`), the fact sheet's links and the
demo's `nav/go` / `nav/follow`. Row values cannot do it — every slot is
URL-encoded — so it takes the `to` literal: a page author, a page file.
_Not executed: the browser's rule is the URL standard's; what the router
does with such a path on a plain click was not tried._

**Fix.** Decide by resolving, not by matching: the address, resolved
against the application's origin, must have that origin; and no control
character or backslash anywhere in it.

### 5. A page file writes anywhere in the tree — Medium

A page file's `widgets` is a map from ANY key to templates
(`packages/schema/src/models/page-file.ts`), and merging writes each at its
key with `setPath(viewModels, model, …)`
(`packages/engine/src/pages-file.ts:244`, `:268`) — as does a cell's
`model` with nested templates (`:252`). `pages.settings`, `on.runs`,
`roles.admin`, another page's widget template are all accepted, and
replacing something the application already had reports nothing: the
"differs between pages" problem compares the files of ONE call. A file
named "inventory" rewrites the admin's settings page.

**Fix.** A model path in a page file is under `widgets.`; a file that
replaces a template its own page did not hold before is a problem that
fails the merge; `page` is a kebab-case name and `route.path` an address
of the application, with a duplicate path refused.

### 6. The CSV export writes live formulas — Medium

`csvField` quotes a value for a comma, a quote or a line break and
nothing else (`packages/antd-widgets/src/cell-range.ts:107`). A row whose
text starts with `=`, `+`, `-` or `@` — a run's name somebody typed — is a
formula when the export is opened in a spreadsheet. ADR-0007 already lists
it as a known limit. The copied text pasted into a sheet does the same.

**Fix.** A field that starts with `=`, `+`, `-`, `@`, a tab or a carriage
return is written with a leading apostrophe — on by default, a setting to
turn it off for a host whose data is numbers.

### 7. Permissions and roles are writable data in the browser — Medium

Two roots are protected from reactions: `viewModels` and `userViewModels`
(`packages/schema/src/contracts/names.ts`, `CONFIG_ROOTS`). The session's
data is not: `{ "set": "app.user.roles", "value": [...] }` and
`{ "set": "app.permissions.editPages", "value": true }` are ordinary
reactions, and a loader's `into` or a control's write-back reaches them
too. The edit lock and the role layers read exactly those paths. And a
page's tree carries every role's entry for every session
(`apps/playground/src/pages/index.ts`): a QA user's browser holds the
admin's table address and the Wirework admin's sessions view.

ADR-0012 says it — "a role layer is a user interface arrangement, not
access control" — and the demo's servers do check the session. But it is
one sentence in one record, and the packages make the opposite easy.

**Fix.** A host declares PROTECTED data roots (the session's: `app.user`,
`app.permissions`, `route`) that no reaction, write-back or loader may
write — refused in the schema and in `store.set`, as the configuration
roots are. The README of every package that reads a permission says: the
server checks again. A host that must not disclose a role's pages sends
each session only its own roles' entries.

### 8. "Newer data is never overwritten" holds for one tab only — Low–Medium

Built today (ADR-0017). The write path refuses to write over a tree whose
stamp it cannot read — the tree AS THIS TAB LOADED IT
(`packages/builder/src/use-commit.ts`). `save` is then handed the whole
tree with no stamp to compare and no revision. A tab of the older build
that loaded before a newer build saved overwrites it; so does any client
that does not use the builder. Related, in the same code:

- the stamp is whatever the document says: an owner nobody registered
  (`{ "x": 2 }`) or a malformed stamp reads as "saved by a newer version",
  the overlay is ignored whole, editing is locked — and there is no way
  out in the user interface (`packages/engine/src/migrations.ts`,
  `stampProblem`);
- `mergePageFiles` reports files of different formats as a problem and
  merges them anyway under the older stamp, and `parsePageFile` never asks
  `stampProblem` — ADR-0017 says a file from the future is refused.

**Fix.** `SaveTrees` carries what the client loaded (the stamp and a
revision) and the host's server refuses a write that is not based on what
it holds — said in the builder's README as a duty, with the demo doing it.
An unknown owner is its own, recoverable, problem; "discard my views and
start over" is an explicit action. A merge of differing formats returns no
tree.

### 9. An input's `pattern` freezes the tab — Low–Medium

`new RegExp(pattern).test(value)` (`packages/antd-widgets/src/validation.ts:47`),
run while rendering and on every keystroke (`hooks/use-input.ts`), with
`pattern` any string from configuration. A pattern that backtracks without
end, and a value at the bound path, freeze every viewer's tab on opening
the page. Boot validation does not look at it. A user's overlay can set
it, against themselves only.

**Fix.** A length cap on the pattern and on the value tested; patterns
checked at boot validation and refused when they nest quantifiers; never
evaluated during render.

### 10. A table setting names any localStorage key — Low

`columnStateKey` is any string, used as the key as it is
(`packages/antd-widgets/src/column-state.ts:77-78`), and the table writes
`{ order, hidden }` there or removes it. Pointed at the application's own
key — a token — hiding a column signs the user out. It cannot read
anything.

**Fix.** The configured key is always written under `wirework:columns:`,
and is letters, digits, `.`, `:`, `-`, `_`.

### 11. FlexLayout's own document passes unchecked — Low–Medium

The engine validates the model as "an object with a layout"
(`packages/engine-flexlayout/src/schema.ts`, `.passthrough()`); the
library reads far more from it. A tab's `icon` is rendered as an image
address: a view a colleague shared can carry one that reports every
opening of the page to their server. Also ADR-0017's one third-party shape
in stored data. _The library's rendering of `icon` was read in its built
file, not run._

**Fix.** The engine owns an allow-list of what a node may say — its type,
id, weight, selection, name, children — and drops the rest when a template
is resolved and when a view is imported.

### 12. A cell may cover the application — Low

flex-rows takes `fixed`, `inset-0` and `z-[99999]`
(`packages/engine-flex-rows/src/classes.ts`): a user's view, or one they
were sent, can lay a widget over the host's whole window — a false
sign-in form in the application's own frame. The values go through
React's style object one property each: no CSS can be injected, in
flex-rows or in css-grid. (css-grid writes a track size it has itself
reported as invalid — harmless in a browser; a host that renders on the
SERVER would put it into the markup unescaped. _Not verified: the
repository has no server rendering._)

**Fix.** The page's root contains its cells (`contain: layout paint`), so
`fixed` means "within the page"; an arbitrary `z-[…]` is refused; css-grid
writes only the tracks that pass its own check.

### 13. No limits on what is imported or stored — Low

A pasted view is parsed whatever its size; the door's walks
(`migrations.ts`: `mapObjects`, `cellsIn`, `mapReactions`) and the page
file's (`mapCells`) recurse without a bound and are called without a
`try`, at boot and on Import; the condition parser recurses per
parenthesis (`expressions.ts`); a view's NAME is checked for emptiness and
dots but not against the path grammar, so `__proto__` reaches `setPath`,
which throws. Each is a crash rather than a breach: a page that will not
open, an Import that shows nothing. _Whether a browser's JSON parser lets
a document nest deep enough was not tried._

**Fix.** Import caps the text, the cells and the nesting; the walks stop
at a depth and report "nested too deep"; the door catches and hands the
document back as unread; a view's name is a path segment.

### 14. Smaller ones — Low to Info

- **A dialog that cannot be closed.** Closing only emits `changed`; a page
  whose wiring keeps `open` true has a modal over the application
  (`hooks/use-dialog.ts`). Validation should warn when `changed` does not
  write the `open` path.
- **Error text shown as it is.** A failed code load shows the import's
  message — usually the chunk's address — and a crash its own
  (`packages/react/src/lazy.tsx`, `WidgetErrorBoundary.tsx`). A sentence
  for the user, the detail to `onError`.
- **An action without `params` takes its arguments unchecked**
  (`reactions.ts:122`). Make `params` required at registration.
- **A tag's tone is looked up through the prototype**: a server value
  `"constructor"` finds a function (`table-cell.ts:59`). `Object.hasOwn`.
- **The demo's "reset every setting" checks no session**, against
  ADR-0012's own rule; with finding 1 any user reaches its button.
- **The demo's test hooks are in its production build**:
  `window.wireworkSavedViews`, `wireworkHoldAnswers`, `wireworkFailCode`,
  `wirework.*` (`apps/playground`). None is in a package — but `boot.ts`
  is offered as a host's template. Behind `import.meta.env.DEV`.

### Two designs not built yet

- **ADR-0011, the dev-server write-through.** The guards it lists are a
  name pattern, the schema, a size limit and "dev only". Missing: a check
  of the request's origin and a token — any web page open in the
  developer's browser could write page files, with reactions, into the
  working tree —; that the body's page is the page in the address; and
  finding 5's restriction before anything is written. A shared authoring
  deployment is a development server reachable by admins, and "Propose"
  commits with the server's own token for whoever is signed in.
- **ADR-0014, pages written by an AI agent.** `pages:check` proves a
  page's shape, not its intent: findings 2, 3, 4, 9 and 10 all pass it.
  And the catalog an agent is told to read is generated from registry
  descriptions — a third party's widget package included — which is a way
  to give the agent instructions. The check takes this record's fixes; the
  catalog marks descriptions as data.

## Checked, and safe

- **No script, no markup, no code chosen by data.** No
  `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in any
  package or the demo. A lazy widget's `load` is a function in code; a
  page only names a registered widget (`packages/react/src/definition.ts`).
  Conditions are a hand-written parser over named checks
  (`packages/engine/src/expressions.ts`).
- **Prototype pollution.** `getPath`, `setPath`, `deletePath` and
  `deepMerge` refuse forbidden segments and read own properties only
  (`packages/schema/src/paths.ts`, `packages/engine/src/paths.ts`); the
  store has tests for it.
- **A server's answer cannot aim a link or pick a cell's kind.** Slots are
  URL-encoded (`table-cell.ts:74`); a column's `cell` is the page's word
  alone (`packages/table-view/src/view.ts`); the answer is parsed by a
  schema; everything is rendered as React text.
- **An overlay cannot carry the wiring KEYS**, and an invalid one is
  ignored whole, with a note (`user-view-models.ts`, `resolve.ts`). What
  finding 1 shows is that the keys are no longer the whole of wiring.
- **Reactions cannot write the view models** (`io.ts`, the store's `set`).
- **Layouts nest four deep, at render and at validation** (`nesting.ts`).
- **Stored column state is read through its schema** (`column-state.ts`).
- **"Sign in as" is the demo's**, in no package.

## Rules the fixes follow

- **Finding 1 is an error in the model, not a bug.** Wiring was defined as
  three KEYS, and then layouts were allowed where settings were. The
  repair is in the model — a template has a kind; an overlay's layout is a
  rearrangement of the cells it was given — and in resolution, so the
  adapter, the builder and validation cannot disagree.
- **Protected roots (finding 7) belong beside the configuration roots:**
  one list, one refusal.
- **Chosen, never typed.** The pattern across findings 2, 3, 5 and 7 is
  the same: a free string where a host should have offered a choice. The
  convention to adopt: anything in configuration that reaches outside the
  page — an action, an address, a storage key, a store root — is chosen
  from what the host registered.
- **One predicate, two places.** The origin check, the model-path check
  and the storage key are each one predicate, used at the schema and at
  the sink — the same function in both places, or they drift.
- **The browser is made honest, not a judge.** The server decides; the
  fixes to findings 1 and 7 do not change that. It should be said on the
  first page: today the builder lets a host's team believe a `when` hides
  something.

## How the fixes are tested

- Each finding becomes a scenario that fails today and a unit test of the
  rule.
- The three "not executed" notes become runs first: the tab in an address,
  the import of a hostile view, a redeploy with two tabs.
- One standing test: a corpus of HOSTILE documents (an overlay that places
  a control over an echo, a page file that writes `roles`, a view with a
  tracking icon) that boot validation and Import must refuse — kept beside
  the frozen formats, never edited.

## Risks to watch

- **Finding 8.** The guard built on 14 November 2026 (ADR-0017) looks like
  protection and is one tab deep. ADR-0017 should say so before a host
  relies on it.

## Phases

1. **What a user can do (the user's row).** Finding 1 — the template's
   kind, the overlay-layout rule —; finding 7 — protected roots —; the
   table of trust in the root README; the hostile corpus with these two.
2. **What a file and a row can do.** Findings 4, 5, 6, 10, 11, 13, and the
   small ones of 14: each a rule and its test.
3. **What a page author can do.** Findings 2, 3 and 9 with ADR-0005's
   `scope` built: actions and addresses offered by the host, destructive
   ones never on `load`. Finding 8 with a revision in `SaveTrees`.
4. **Before they are built:** ADR-0011's write-through and ADR-0014's
   check take the guards named above.

## For the owner to decide

1. Whether phase 1 goes before any other work — this record proposes yes:
   finding 1 contradicts what ADR-0003 promises today.
2. A user's own layout restricted to the page's own cells (what this
   record proposes, with role layers exempt), or users allowed to place
   widgets from a list the host offers.
3. Whether the browser should hold other roles' pages at all (finding 7):
   keep sending every role's entry and document it, or have the host send
   each session its own.
4. The CSV export neutralising formulas by default (what this record
   proposes), or only as a setting.
5. Whether the three "not executed" findings are tried in a browser
   before their fixes are scheduled — this record proposes it; it is an
   hour.
