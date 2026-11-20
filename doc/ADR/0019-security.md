# ADR-0019: Security — who is trusted with what, and the vulnerabilities found in the eighteen records

- **Status:** Proposed — a review of 0001–0018; nothing fixed
- **Deciders:** the product owner

## 1. Decision

A review of records 0001–0018 against the code. It writes down who is
trusted with what, lists fourteen findings (one high, six medium, the rest
low) with a fix for each, and proposes four phases. Nothing is fixed. No
way was found to run script. The one HIGH finding: a user's own layout
places any registered widget over any existing widget template, so a
template written to SHOW a value becomes one that WRITES it.

## 2. Problem

Wirework has no security design: each record decided its own piece. This
review reads all of them and says where the pieces leave a hole.

A customer's security reviewer will ask two things, and neither can be
answered today: "what can a user of the application do that they should
not" and "what must our server check". The trust table answers them and is
the first deliverable, before any fix.

Every candidate weakness was looked for in the code; a finding names the
file and line that carries it. **Nothing was executed**: "confirmed" means
confirmed by reading the code path. Three conclusions rest on how a
browser or a library behaves; those findings say "not executed".

## 3. Details

### Who is trusted with what

The records assume these without saying them. They are the security model
the findings are measured against.

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

### Rules the fixes follow

- **Finding 1 is an error in the model, not a bug.** Wiring was defined as
  three KEYS, and then layouts were allowed where settings were. The
  repair is in the model — a template has a kind; an overlay's layout is a
  rearrangement of the cells it was given — and in resolution, so the
  adapter, the builder and validation cannot disagree.
- **Protected roots (finding 7) belong beside the configuration roots:**
  one list, one refusal.
- **Chosen, never typed.** Findings 2, 3, 5 and 7 share one pattern: a free
  string where a host should have offered a choice. Anything in
  configuration that reaches outside the page — an action, an address, a
  storage key, a store root — is chosen from what the host registered.
- **One predicate, two places.** The origin check, the model-path check
  and the storage key are each one function, used at the schema and at the
  sink, or they drift.
- **The browser is made honest, not a judge.** The server decides; the
  fixes to findings 1 and 7 do not change that. It is said on the first
  page: today the builder lets a host's team believe a `when` hides
  something.
- **Every fix is a rule that fits in a line** — "an address is checked by
  resolving it", "a file writes under its own page", "a control's template
  says its kind".

### How the fixes are tested

- Each finding becomes a scenario that fails today and a unit test of the
  rule.
- The three "not executed" notes become runs first: the tab in an address,
  the import of a hostile view, a redeploy with two tabs.
- One standing test: a corpus of HOSTILE documents (an overlay that places
  a control over an echo, a page file that writes `roles`, a view with a
  tracking icon) that boot validation and Import must refuse — kept beside
  the frozen formats, never edited.

### Phases proposed

1. **What a user can do.** Finding 1 (the template's kind, the
   overlay-layout rule); finding 7 (protected roots); the trust table in
   the root README; the hostile corpus with these two.
2. **What a file and a row can do.** Findings 4, 5, 6, 10, 11, 13 and the
   small ones of 14: each a rule and its test.
3. **What a page author can do.** Findings 2, 3 and 9 with ADR-0005's
   `scope` built: actions and addresses offered by the host, destructive
   ones never on `load`. Finding 8 with a revision in `SaveTrees`.
4. **Before they are built:** ADR-0011's write-through and ADR-0014's
   check take the guards named under "Two designs not built yet".

The least code that closes the most is five small changes, none above
fifty lines: the template's kind and the overlay-layout rule (1),
protected roots (7), the address check (4), the page file's paths (5), the
CSV apostrophe (6).

### For the owner to decide

1. Whether phase 1 goes before any other work. Proposed: yes — finding 1
   contradicts what ADR-0003 promises.
2. A user's own layout restricted to the page's own cells (proposed, with
   role layers exempt), or users allowed to place widgets from a list the
   host offers.
3. Whether the browser should hold other roles' pages at all (finding 7):
   keep sending every role's entry and document it, or have the host send
   each session its own.
4. The CSV export neutralising formulas by default (proposed), or only as
   a setting.
5. Whether the three "not executed" findings are tried in a browser before
   their fixes are scheduled. Proposed: yes; it is an hour.

## 4. Options weighed

### Alternatives weighed

- **Closing finding 1.** Restrict a user's own layout to the cells the
  page's shared layout holds — proposed. ADR-0003 already forbade a user
  adding a widget, so nothing is lost. A ROLE's view adds cells on purpose
  (ADR-0012) and is written by page authors, so the rule is for the user's
  overlay and for files, not for role layers. The alternative — widgets
  from a list the host offers — is the owner's point 2.
- **Signed templates, capability tokens.** Refused: nobody would read it.
- **Findings 2 and 3 fixed here.** No: they need ADR-0005's `scope` built,
  not an improvised rule (phase 3).
- **The order.** Finding 1 first: there the records' own words were wrong.

### The findings

| #   | Finding                                                                         | Severity | Who can use it                            |
| --- | ------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| 1   | A user's own layout places any widget over any template: a read becomes a write | High     | any user; a shared view file              |
| 2   | Any action on any event, as the viewer (confused deputy)                        | Medium   | a page author; a page file                |
| 3   | A table loads from any URL, into any store path                                 | Medium   | a page author; a page file                |
| 4   | "An address of the application" accepts a tab: a link leaves the origin         | Medium   | a page author; a page file                |
| 5   | A page file writes anywhere in the tree when merged                             | Medium   | whoever sends a page file                 |
| 6   | The CSV export writes live spreadsheet formulas                                 | Medium   | anyone whose text reaches a table row     |
| 7   | Permissions and roles are writable store data; all roles' pages reach all users | Medium   | a page author; any user through finding 1 |
| 8   | "Newer data is never overwritten" holds for one browser tab only                | Low–Med  | a second tab, a rolling deploy            |
| 9   | An input's `pattern` is a regular expression from configuration                 | Low–Med  | a page author; a page file                |
| 10  | A table setting names any localStorage key to overwrite                         | Low      | a page author                             |
| 11  | FlexLayout's own document passes unchecked                                      | Low–Med  | whoever sends a view file                 |
| 12  | A cell may leave its box and cover the application                              | Low      | any user's view; a shared view file       |
| 13  | No limits on the size or depth of what is imported or stored                    | Low      | whoever sends a file; a stored document   |
| 14  | Smaller ones: a dialog that cannot close, error text shown as is, and four more | Low–Info | —                                         |

#### 1. A user's own layout places any widget over any template — High

- **Where.** The overlay's settings may not hold the keys `inputs`, `on`,
  `when` (`packages/schema/src/models/user-view-models.ts:28-32`), but they
  may hold a layout (a card's `content`), and a user's `templates` are
  whole page templates (`:55`). A cell is three free strings — widget,
  model path, template name (`models/page-template.ts:16-35`) — and
  `resolveCell` (`packages/engine/src/resolve.ts`) looks the widget and
  the template up independently: nothing says which KIND a template was
  written for. Cells inside a container are bound like any others
  (`packages/react/src/useNestedLayout.ts:72`, `:86-98`), and a control
  writes back to its bound path by default
  (`packages/engine/src/reactions.ts:59-67`).
- **What goes wrong.** The demo's FlexLayout page echoes the session's
  roles: `{ "inputs": { "value": "app.user.roles" }, … }`
  (`apps/playground/src/pages/flexlayout/widgets.json:108-114`) — also a
  valid `multi-select` template. A user's view with the cell
  `{ "widget": "antd-multi-select", "model": "widgets.flexlayout.sessionRoles", "template": "default" }`
  and the setting `options: [{ "value": "admin" }]` is a dropdown that
  writes `app.user.roles`; the page is then read through the admin's
  layer. The same way a user places another role's button in their view. A
  shared view file carries a layout, so a colleague can send one. In the
  browser roles, conditions and role views stop meaning anything; on a
  host that trusts the page it is privilege escalation.
- **Fix.** Two rules in resolution. A template map records the KIND it was
  written for (the builder writes it; for old data, the kind of the cell
  that first pointed at it); a cell of another kind is a cell problem. A
  layout an overlay owns — a user's template, a `content` setting — may
  hold only cells whose (id, widget, model) the page's shared layout holds
  for that container.

#### 2. Any action on any event, as the viewer — Medium

ADR-0005's `scope` is not built: a handler gets the event, the store and
the arguments — no page, no caller (`packages/engine/src/reactions.ts:144`)
— and resolution only asks whether the action exists. A page author who is
not an admin wires `runs/delete-selected` to the `load` of a shared page;
it runs under the session of the admin who opens it.
**Fix.** Build `scope`: an action declares what it is (`destructive`,
`needs a gesture`); resolution refuses a destructive one on `load` and on
any event that is not a person's click; the builder offers an author only
the actions their own roles may wire.

#### 3. A table loads from any URL, into any store path — Medium

`table-view/load` takes `url: z.string().min(1)`
(`packages/table-view/src/view.ts:48`) and posts to it (`api.ts:72`);
`into` is any string (`loader.ts`); the view is read back from the store
(`<into>.view`), where a reaction may have changed its URL. A page sends
what a user filters by to another origin and shows that origin's rows, or
posts with the user's cookies to any endpoint; `into: "app.user"` writes
into the session's data.
**Fix.** `url` is an address of the application (finding 4's check) or one
of the prefixes the host's transport allows; `into` is a data path outside
the protected roots (finding 7); the view is kept where reactions cannot
write, or checked against the declaration on every request.

#### 4. "An address of the application" accepts a tab — Medium

`appPathSchema` is `/^\/(?![/\\])/`
(`packages/widget-contracts/src/table-cell.ts:24`): it looks at the second
character only. A browser drops tabs and line breaks from a URL, so
`"/\t/evil.example/x"` passes and leads to `//evil.example/x`. The check
guards a link cell's `to`, the `follow` decision (`use-table-rows.ts`), the
fact sheet's links and the demo's `nav/go` / `nav/follow`. Row values
cannot do it (slots are URL-encoded); it takes the `to` literal. _Not
executed: what the router does with such a path on a plain click._
**Fix.** Decide by resolving: the address, resolved against the
application's origin, must have that origin; no control character or
backslash anywhere in it.

#### 5. A page file writes anywhere in the tree — Medium

A page file's `widgets` is a map from ANY key to templates
(`packages/schema/src/models/page-file.ts`); merging writes each with
`setPath(viewModels, model, …)` (`packages/engine/src/pages-file.ts:244`,
`:268`), as does a cell's `model` with nested templates (`:252`).
`pages.settings`, `roles.admin`, another page's template are accepted, and
replacing what the application had reports nothing. A file named
"inventory" rewrites the admin's settings page.
**Fix.** A model path in a page file is under `widgets.`; replacing a
template its own page did not hold fails the merge; `page` is a kebab-case
name and `route.path` an address of the application, a duplicate path
refused.

#### 6. The CSV export writes live formulas — Medium

`csvField` quotes a value for a comma, a quote or a line break and nothing
else (`packages/antd-widgets/src/cell-range.ts:107`). A row whose text
starts with `=`, `+`, `-` or `@` — a run's name somebody typed — is a
formula when the export, or the copied text, lands in a spreadsheet.
**Fix.** A field that starts with `=`, `+`, `-`, `@`, a tab or a carriage
return is written with a leading apostrophe — on by default, a setting to
turn it off for a host whose data is numbers.

#### 7. Permissions and roles are writable data in the browser — Medium

Only `viewModels` and `userViewModels` are protected from reactions
(`CONFIG_ROOTS`, `packages/schema/src/contracts/names.ts`).
`{ "set": "app.user.roles", … }` and
`{ "set": "app.permissions.editPages", "value": true }` are ordinary
reactions; a loader's `into` or a control's write-back reaches them too —
and the edit lock and the role layers read those paths. Also, a page's
tree carries every role's entry for every session
(`apps/playground/src/pages/index.ts`): a QA user's browser holds the
admin's table address. ADR-0012 says a role layer "is a user interface
arrangement, not access control" — one sentence in one record.
**Fix.** A host declares PROTECTED data roots (`app.user`,
`app.permissions`, `route`) that no reaction, write-back or loader may
write — refused in the schema and in `store.set`. Every package README
that reads a permission says: the server checks again. A host that must
not disclose a role's pages sends each session only its own roles'
entries.

#### 8. "Newer data is never overwritten" holds for one tab only — Low–Medium

The write path refuses to write over a tree whose stamp it cannot read —
the tree as THIS TAB loaded it (`packages/builder/src/use-commit.ts`);
`save` gets the whole tree with no stamp to compare and no revision. A tab
of the older build that loaded before a newer build saved overwrites it;
so does any client that does not use the builder. Also: an owner nobody
registered (`{ "x": 2 }`) or a malformed stamp reads as "saved by a newer
version" — overlay ignored, editing locked, no way out in the user
interface (`stampProblem`, `packages/engine/src/migrations.ts`);
`mergePageFiles` reports files of different formats and merges them anyway
under the older stamp; `parsePageFile` never asks `stampProblem`.
**Fix.** `SaveTrees` carries what the client loaded (the stamp and a
revision) and the host's server refuses a write not based on what it holds
— a duty stated in the builder's README, the demo doing it. An unknown
owner is its own, recoverable, problem; "discard my views and start over"
is an explicit action. A merge of differing formats returns no tree.

#### 9. An input's `pattern` freezes the tab — Low–Medium

`new RegExp(pattern).test(value)`
(`packages/antd-widgets/src/validation.ts:47`) runs while rendering and on
every keystroke (`hooks/use-input.ts`); `pattern` is any string and boot
validation does not look at it. A pattern that backtracks without end,
with a value at the bound path, freezes every viewer's tab. A user's
overlay can set it, against themselves only.
**Fix.** A length cap on the pattern and on the value tested; patterns
checked at boot validation and refused when they nest quantifiers; never
evaluated during render.

#### 10. A table setting names any localStorage key — Low

`columnStateKey` is any string, used as the key as it is
(`packages/antd-widgets/src/column-state.ts:77-78`); the table writes its
column state there or removes it. Pointed at the application's own key — a
token — hiding a column signs the user out. It cannot read anything.
**Fix.** The configured key is always written under `wirework:columns:`,
and is letters, digits, `.`, `:`, `-`, `_`.

#### 11. FlexLayout's own document passes unchecked — Low–Medium

The engine validates the model as "an object with a layout"
(`packages/engine-flexlayout/src/schema.ts`, `.passthrough()`); the library
reads far more. A tab's `icon` is rendered as an image address: a shared
view can report every opening of the page to the sender's server. It is
also ADR-0017's one third-party shape in stored data. _Not executed: the
library's rendering of `icon` was read in its built file._
**Fix.** The engine owns an allow-list of what a node may say — type, id,
weight, selection, name, children — and drops the rest when a template is
resolved and when a view is imported.

#### 12. A cell may cover the application — Low

flex-rows takes `fixed`, `inset-0` and `z-[99999]`
(`packages/engine-flex-rows/src/classes.ts`): a user's view, or one they
were sent, lays a widget over the host's whole window — a false sign-in
form in the application's frame. No CSS can be injected: values go through
React's style object one property each. (css-grid writes a track size it
has itself reported as invalid — harmless in a browser, unescaped markup
on a host that renders on the server. _Not verified: the repository has no
server rendering._)
**Fix.** The page's root contains its cells (`contain: layout paint`), so
`fixed` means "within the page"; an arbitrary `z-[…]` is refused; css-grid
writes only the tracks that pass its own check.

#### 13. No limits on what is imported or stored — Low

A pasted view is parsed whatever its size. The door's walks
(`migrations.ts`: `mapObjects`, `cellsIn`, `mapReactions`) and the page
file's (`mapCells`) recurse without a bound and without a `try`; the
condition parser recurses per parenthesis (`expressions.ts`); a view's
NAME is not checked against the path grammar, so `__proto__` reaches
`setPath`, which throws. Each is a crash, not a breach: a page that will
not open, an Import that shows nothing. _Not executed: whether a browser's
JSON parser lets a document nest deep enough._
**Fix.** Import caps the text, the cells and the nesting; the walks stop
at a depth and report "nested too deep"; the door catches and hands the
document back as unread; a view's name is a path segment.

#### 14. Smaller ones — Low to Info

- **A dialog that cannot be closed.** Closing only emits `changed`; wiring
  that keeps `open` true leaves a modal over the application
  (`hooks/use-dialog.ts`). Fix: validation warns when `changed` does not
  write the `open` path.
- **Error text shown as it is.** A failed code load shows the import's
  message — usually the chunk's address — and a crash its own
  (`packages/react/src/lazy.tsx`, `WidgetErrorBoundary.tsx`). Fix: a
  sentence for the user, the detail to `onError`.
- **An action without `params` takes its arguments unchecked**
  (`reactions.ts:122`). Fix: `params` required at registration.
- **A tag's tone is looked up through the prototype**: a server value
  `"constructor"` finds a function (`table-cell.ts:59`). Fix:
  `Object.hasOwn`.
- **The demo's "reset every setting" checks no session**
  (`settings/reset-all`, `apps/playground/src/demo/install.ts`), against
  ADR-0012's own rule; with finding 1 any user reaches its button.
- **The demo's test hooks are in its production build**
  (`window.wireworkSavedViews`, `wireworkHoldAnswers`, `wireworkFailCode`,
  `wirework.*`), and `boot.ts` is offered as a host's template. Fix: behind
  `import.meta.env.DEV`.

#### Two designs not built yet

- **ADR-0011, the dev-server write-through.** Its guards are a name
  pattern, the schema, a size limit and "dev only". Missing: a check of
  the request's origin and a token (any web page open in the developer's
  browser could write page files, with reactions, into the working tree);
  that the body's page is the page in the address; finding 5's restriction
  before anything is written. A shared authoring deployment is a
  development server reachable by admins, and "Propose" commits with the
  server's own token for whoever is signed in.
- **ADR-0014, pages written by an AI agent.** `pages:check` proves a
  page's shape, not its intent: findings 2, 3, 4, 9 and 10 all pass it.
  The catalog an agent reads is generated from registry descriptions — a
  third party's widget package included —, a way to give the agent
  instructions. The check takes this record's fixes; the catalog marks
  descriptions as data.

### Checked, and safe

- **No script, no markup, no code chosen by data.** No
  `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` in any
  package or the demo. A lazy widget's `load` is a function in code; a
  page only names a registered widget. Conditions are a hand-written parser
  over named checks (`packages/engine/src/expressions.ts`).
- **Prototype pollution.** `getPath`, `setPath`, `deletePath` and
  `deepMerge` refuse forbidden segments and read own properties only.
- **A server's answer cannot aim a link or pick a cell's kind.** Slots are
  URL-encoded (`table-cell.ts:74`); a column's `cell` is the page's word
  alone; the answer is parsed by a schema; everything renders as React
  text.
- **An overlay cannot carry the wiring KEYS**, and an invalid one is
  ignored whole, with a note. Finding 1 shows the keys are not the whole of
  wiring.
- **Reactions cannot write the view models** (`io.ts`, the store's `set`).
- **Layouts nest four deep, at render and at validation** (`nesting.ts`).
- **Stored column state is read through its schema** (`column-state.ts`).
- **"Sign in as" is the demo's**, in no package.

### Risk to watch

The newer-data guard of ADR-0017 looks like protection and is one tab deep
(finding 8). ADR-0017 should say so before a host relies on it.
