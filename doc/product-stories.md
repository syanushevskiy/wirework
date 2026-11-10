# Product stories — Xsight Wirework

One epic, thirty-five stories: fourteen done between 15 and 29 September 2026, one on 23 October 2026 (WW-21), two
on 24 October 2026 (WW-22, WW-23), two on 1 November 2026 (WW-24, WW-25), two on 2 November 2026 (WW-26, WW-27),
one on 3 November 2026 (WW-28), one on 5 November 2026 (WW-30), one on 6 November 2026 (WW-31), one on
7 November 2026 (WW-32) and one on 9 November 2026 (WW-34), nine to do (WW-15 to WW-20, WW-29, WW-33, WW-35). Written
for managers and product owners: each story says who gets what and why. For the user-facing stories (WW-1 to WW-11,
WW-16 to WW-20, WW-21 to WW-32, WW-34, WW-35) the acceptance criteria are Given / When / Then scenarios in the same language as the project's
automated test suite, so QA verifies a story by reading it; the enabler and quality stories (WW-12 to WW-15) keep plain
checkable statements. The keys `WW-n` are
placeholders for the numbers JIRA assigns. "Delivered" gives the dates and commits for traceability; "Verified by" names
the automated scenarios or tests that prove the criteria today. Every "Done" story is merged and its criteria pass in the
automated suite in Microsoft Edge; the suite runs on a developer's machine until story WW-15 puts it on a shared build
server.

## Epic · Xsight Wirework - internal web pages built from configuration, not code

Today every internal page (a list of test runs, a status overview, a settings screen) needs a developer and a release.
Wirework lets a page be assembled from ready-made widgets — tables, filters, buttons, labels — wired to data and to each
other without programming, in a visual builder, and lets every user tune a shared page for themselves. Three groups of
users: page builders who do not code, the people who use the pages, and the teams that embed Wirework in their own
application. A demo application with seven pages shows it working end to end on simulated servers.

### WW-1 · Xsight Wirework - The visual page builder: searchable widget catalog, generated settings form, widget editing

**Type:** User feature · **Status:** Done · **Delivered:** 21 Sep (546fc06), 23 Sep (5dfc3d3, 36dcc4d, 47988b5), 28 Sep
(53816ce, e1db979, 39b8ca3)

**Short description:** As a page builder without programming skills, I open the builder, find a widget in a catalog with
live previews, fill in a form generated for that widget (where its data comes from, its settings, what happens on its
events), add it to the page and later reopen and change it, so that I assemble a working page without a developer. The
builder can also be embedded in other company applications.

**Acceptance criteria:**

- **Given** the builder page is open, **when** I press Show widgets, **then** a card with a live preview appears for
  every available widget.
- **Given** the catalog is open, **when** I type part of a widget's name and pick a suggestion, **then** that widget is
  added and the search field is empty again.
- **Given** I have chosen a widget, **when** I accept the proposed data address for one of its inputs, **then** the
  widget works on that address even though nothing was stored there before.
- **Given** a widget's settings form, **when** a setting allows a fixed set of values, **then** it appears as a dropdown;
  a yes/no setting appears as a checkbox; a text setting with rules shows a message when the text breaks them.
- **Given** I wire an event to an application action that needs parameters, **when** a required parameter is empty or
  typed structured text is invalid, **then** Add is disabled with the reason, and enabled as soon as the form is valid.
- **Given** a widget is on the page, **when** I edit it, change a setting and save, **then** its form opened prefilled
  and the page shows the change; the next widget of the same kind gets the next name, and a removed widget frees its
  name.

**Verified by:** `builder.feature` (31 scenarios), builder and builder-component unit tests.

### WW-2 · Xsight Wirework - Thirteen ready-made widgets

**Type:** User feature · **Status:** Done · **Delivered:** 16 Sep (1c81b1d, 39a12ef), 20 Sep (708d0a2), 21 Sep (1508358),
28 Sep (26bfdd6)

**Short description:** As a page builder, I have thirteen widgets covering the common needs of an internal page — label,
button, input, select, multi-select, checkbox, tag, progress, alert, pagination, refresher, filter bar and table — so that
a typical page is assembled with no custom development, in the company's standard look.

**Acceptance criteria:**

- **Given** a select, a checkbox and a tag bound to the select are on a page, **when** I choose a value and tick the
  checkbox, **then** the choice is stored and shown by the tag, and the checkbox stores yes or no.
- **Given** a progress bar and an alert bound to stored values, **when** the stored percentage exceeds 100 or the
  alert's severity changes, **then** the bar stops at 100 and the alert announces its severity.
- **Given** an input with a ready-made rule or a custom pattern, **when** I type text that breaks the rule, **then** the
  input shows the problem and stores the text only when it is valid.
- **Given** the runs list with a refresher, **when** I press Refresh or turn auto-refresh on, **then** the data on screen
  reloads and I stay on my current page; auto-refresh is off by default and runs every 5 seconds when on.
- **Given** an Applications multi-select and a Test suites multi-select that depends on it, **when** I pick an
  application and later remove it, **then** only that application's suites are offered, and the suites chosen from it
  are dropped.
- **Given** a table listing the records found at a data address and a filter bar, **when** I click a row or move to it
  with the keyboard, **then** the row is selected and its record is available to the widgets wired to it; clearing a
  filter brings every row back.

**Verified by:** `basic-widgets.feature`, `refresher.feature`, `filters.feature`, `table.feature`, `binding.feature`;
85 widget showcase tests.

### WW-3 · Xsight Wirework - Table columns that show text, coloured status tags, links or company-specific content

**Type:** User feature · **Status:** Done · **Delivered:** 22 Sep (aad56b6, 0b4187b, b43a98c, fa92585, 28279e1)

**Short description:** As a page builder, I decide how each table column displays — plain text, a coloured tag per
status, a link to the record's own page, or a display the company provides (such as a Copy button) — so that lists are
readable and navigable without code.

**Acceptance criteria:**

- **Given** the runs list shows Status as a tag column, **when** a run is Failed, Success, Running or Queued, **then** its
  tag is red, green, blue or grey; a status without a configured colour gets the neutral one.
- **Given** the # and Name columns link to the run, **when** I click a run's name, **then** the run's page opens and the
  row is not selected.
- **Given** a linked cell, **when** I Ctrl/Cmd-click or middle-click it, **then** it opens in a new tab like any link; a
  record without an id shows plain text instead of a dead link.
- **Given** the Reference column carries a Copy button, **when** I press Copy, **then** the reference is on my clipboard
  and the row stays unselected.
- **Given** a column asks for a company-provided display that nobody provided, **when** the table renders, **then** the
  cell shows the value as plain text and the table keeps working.
- **Given** a link column configured with an address outside the application, **when** the page is checked, **then** the
  configuration is rejected and no such link ever appears.

**Verified by:** `table-cells.feature` (7 scenarios), cell unit tests.

### WW-4 · Xsight Wirework - Tables that take their columns, filters and paging from the server

**Type:** User feature · **Status:** Done · **Delivered:** 21 Sep (fa0e1ca, 546fc06), 22 Sep (b43a98c, 51f4959)

**Short description:** As a page builder, I put a table on a page by giving only its data address; the server says which
columns and filters to show, so that when the backend adds a column the page shows it without a release, and the page
states only what it wants different — hide or rename a column, drop a filter, add a filter of its own.

**Acceptance criteria:**

- **Given** the runs page, **when** I open it and the server has not answered yet, **then** the table shows its loading
  state with no rows and no filters.
- **Given** the server has answered, **when** the runs page shows, **then** the columns and the filter bar are the ones
  the server described, with the first page of rows and the total count.
- **Given** the runs list on page 2, **when** I pick Failed in the Status filter, **then** the list returns to page 1
  showing only failed runs, and only rows and count were requested again.
- **Given** the server offers Inbound and Status filters and hides its Message column, **when** the demo runs page shows,
  **then** the Inbound column and filter are not shown, a Suite filter of the page's own is offered, and the Status
  filter has no "no value" option.
- **Given** I set the page size to 10 on Settings, **when** I open the runs page, **then** 10 rows are shown per page.
- **Given** I configure a table in the builder with invalid column configuration, **when** I look at the Add button,
  **then** it is disabled with the reason until the configuration is valid.

**Verified by:** `table-view.feature` (13 scenarios), `app.feature`, 19 loader unit tests against the example server
answers in `doc/tableApi/`.

### WW-5 · Xsight Wirework - Four page layouts to choose from, and drag-and-resize editing of widgets

**Type:** User feature · **Status:** Done · **Delivered:** 15 Sep (7d6007f), 20 Sep (708d0a2), 28 Sep (26bfdd6, 39b8ca3)

**Short description:** As a page builder, I choose how a page arranges its widgets — a free grid, a snapping grid,
dockable panels, or stacked rows that adapt to the screen width — and in edit mode I drag and resize widgets and save, so
that pages fit their purpose and screen without a developer.

**Acceptance criteria:**

- **Given** a page in view mode, **when** I look at the widgets, **then** there are no drag handles or borders.
- **Given** a page in edit mode, **when** I drag a widget onto another or resize it and press Save, **then** the new
  arrangement is kept; on a shared demo page it is kept as my personal view, not as the team's page.
- **Given** I moved a widget in edit mode, **when** I press Cancel, **then** the saved arrangement comes back.
- **Given** a page in edit mode, **when** a change would break the layout, **then** it is refused and the page stays as
  it was.
- **Given** the builder page with no widgets, **when** I choose each of the four layout types in turn and add a widget,
  **then** the page renders on that layout; once the first widget is placed the layout type is fixed and the toolbar
  says why.
- **Given** a page on the stacked-rows layout, **when** the screen is narrow, **then** the rows adapt to the width.

**Verified by:** `layout.feature` (10 scenarios), layout engine unit tests.

### WW-6 · Xsight Wirework - Editing a page: Edit, Save and Cancel, permissions, and a reason whenever an action is unavailable

**Type:** User feature · **Status:** Done · **Delivered:** 23 Sep (a6d85e6), 28 Sep (e1db979, 26bfdd6)

**Short description:** As a user with edit rights, I switch a page into edit mode, make my changes and Save or Cancel them
in one go; as a user without rights I see the controls disabled with the reason, so that nobody wonders where a button
went. The company's application decides where saved pages are kept.

**Acceptance criteria:**

- **Given** I have the edit permission, **when** I press Edit, change the page and press Save, **then** the application
  receives the page once and the toolbar returns to view mode.
- **Given** I pressed Edit and changed nothing, **when** I press Save, **then** nothing is sent.
- **Given** I am signed in without the edit permission, **when** I open a page, **then** Edit is disabled and says that I
  lack the permission.
- **Given** I am editing a page, **when** my edit permission is revoked and I press Save, **then** nothing is saved and
  the page returns to view mode.
- **Given** any disabled toolbar control (Add, Edit, the layout choice, the personal-view switch), **when** I look at it,
  **then** it says in words why it is unavailable: no permission, finish editing first, personal view is on, page is
  loading, layout already chosen.
- **Given** a widget on the page crashes, **when** the page renders, **then** its cell shows a message naming the widget
  and the error, the other widgets keep working, and the application is informed.

**Verified by:** `app.feature` (permission scenarios), `builder.feature` (save scenarios), toolbar stories and builder
unit tests.

### WW-7 · Xsight Wirework - Each user can personalize a shared page without changing it for others; broken pages degrade gracefully

**Type:** User feature · **Status:** Done · **Delivered:** 17 Sep (a680015), 21 Sep (416fcc7), 28 Sep (aa732d1)

**Short description:** As a dashboard user, I rearrange and tune the widgets on a shared page for myself, so that my view
is mine and the team's page is untouched; and when a page or one of its widgets is misconfigured I still see what can be
shown, with a notice saying what is wrong and where.

**Acceptance criteria:**

- **Given** a shared page with my personal view on, **when** I move or tune a widget, **then** my view changes and the
  team's page is untouched; my view can change look, settings and position, never where data comes from.
- **Given** I removed a cell from my personal view, **when** I turn the personal view off, **then** the cell is back: it
  stayed on the shared page.
- **Given** my personal arrangement, **when** I move to another demo page and back, **then** it is still there; after a
  reload or a visit to the builder it starts over.
- **Given** the builder page has no widgets, **when** I look at the personal-view switch, **then** it is off and
  unavailable; once a widget is added it becomes available, and while it is on, Add is locked because widgets would go to
  the shared page.
- **Given** a personal view with content the page does not understand, **when** the page opens, **then** the view is
  ignored with a visible notice and the shared page shows.
- **Given** a page with one misconfigured widget, **when** the page opens, **then** the other widgets show and the
  broken cell shows a message naming the problem and where it is; a page misconfigured as a whole shows a message
  instead of a blank.

**Verified by:** `overlay.feature` (9 scenarios), `builder-overlay.feature` (7), `errors.feature`, page view unit tests.

### WW-8 · Xsight Wirework - Widgets react to each other without code; pages and tables load their data when opened

**Type:** User feature · **Status:** Done · **Delivered:** 20 Sep (dac4973), 21 Sep (284c969), 28 Sep (aa732d1)

**Short description:** As a page builder, I make one widget respond to another — a row click fills a label, a filter
change reloads a table, a button triggers an application action — by picking from lists, and every page and table
requests its own data when it opens, so that pages are live on arrival and need no custom code.

**Acceptance criteria:**

- **Given** the runs list and a label wired to the selected run, **when** I click a row, **then** the label shows that
  run.
- **Given** a button wired to an application action with parameters set in the builder, **when** I press it, **then**
  the action runs with those parameters.
- **Given** the event log is open, **when** I open a page with a table, **then** one "page opened" and one "table loaded"
  entry appear; adding a widget or saving the page adds them again.
- **Given** a filter bar wired to reload a table, **when** I change a filter twice quickly, **then** the table shows the
  result of the latest change; an older answer never overwrites a newer one.
- **Given** I add a widget without choosing where its data goes, **when** I use it, **then** it works on a proposed
  address.
- **Given** the builder, **when** I wire an event, **then** I can only choose a target or an action with fixed
  parameters; no formula or transformation is offered, so a page stays readable and safe.

**Verified by:** `events.feature` (14 scenarios), `load-events.feature` (9), event and reaction unit tests.

### WW-9 · Xsight Wirework - Demo application: overview, runs list, run page, settings and builder on simulated servers

**Type:** User feature · **Status:** Done · **Delivered:** 20 Sep (b24f77c), 21 Sep (546fc06), 22 Sep (bd6125e), 28 Sep
(c3f4a95), 29 Sep (8f70c9b)

**Short description:** As a stakeholder, I open a demo application with five pages built on Wirework — an overview, a list
of test runs that progresses while I watch, a run's own page, settings and the builder — so that I see the product work
end to end before any real backend exists. The demo is also the template a team copies to adopt Wirework.

**Acceptance criteria:**

- **Given** the demo, **when** I use the menu, **then** Overview, Runs, Settings and Builder open; a run opens on its
  own address; a wrong address opens the overview; an unknown run says "There is no run …"; the browser's Back button
  returns to the previous page as a fresh visit.
- **Given** I open the demo, **when** the sign-in request is still in flight, **then** a "Signing in…" label shows; once
  answered, my name, role and permissions appear and stay while I move between pages.
- **Given** I changed my display name and page size on Settings, **when** I open Overview and Runs, **then** the name is
  shown and the runs list uses the page size.
- **Given** I was on the Runs page, **when** I switch to another page and back, **then** the runs list starts empty and
  fills when the simulated server answers; data of the previous visit is gone.
- **Given** any demo page, **when** I expand the state inspector or the event log, **then** I see what the page holds and
  what happened, and I can change a stored value from the inspector.
- **Given** a team starting a new application, **when** they copy the host part (sign-in, page visits, widget
  registration) without the demo content, **then** they have a working shell to register their own widgets and pages.

**Verified by:** `app.feature` (17 scenarios), `visits.feature` (6), `state.feature` (5).

### WW-10 · Xsight Wirework - Shared page data, with the user's session kept while moving between pages

**Type:** Enabler · **Status:** Done · **Delivered:** 20 Sep (6a42f54), 21 Sep (b64c97d), 22 Sep (02dcc1c)

**Short description:** As a dashboard user, every widget on a page works from the same data, so a filter I pick is
reflected in the table at once, and my login, permissions and reference lists stay with me between pages while each
page's own data is fresh on every visit. A company that already has its own data layer can plug it in.

**Acceptance criteria:**

- **Given** a filter and a table on the same page use the same stored value, **when** I change the filter, **then** the
  table updates at once, and widgets whose data did not change do not redraw.
- **Given** I am signed in on Overview, **when** I switch to Runs, **then** my user, permissions and lists are still
  there, and the runs list reloads.
- **Given** developer tools are off, **when** a support engineer turns them on from the browser console, **then** every
  data change is listed by name in the browser's developer tools, and the choice survives a reload.
- **Given** an application with its own data store, **when** it plugs that store in, **then** the widgets work on it
  unchanged.

**Verified by:** `binding.feature`, `app.feature`, `visits.feature`; 39 store unit tests.

### WW-11 · Xsight Wirework - Every widget type has a specification; a widget that does not match it is rejected at startup

**Type:** Enabler · **Status:** Done · **Delivered:** 16 Sep (1c81b1d), 20 Sep (308043f), 28 Sep (1f4b2ed)

**Short description:** As a team adding our own widgets, each widget type is described by a specification — the data it
takes, what it shows, what it can trigger, which settings it has — so that a faulty widget is rejected with a precise
message before any user sees a broken page, and the builder's settings form comes from the specification without extra
work.

**Acceptance criteria:**

- **Given** the demo includes four deliberately broken widget types, **when** the application starts, **then** all four
  are rejected and the report names each widget and its exact mismatch: a missing or extra input, event or setting, or a
  wrong requirement.
- **Given** the application has started, **when** someone tries to add a widget, action or layout type afterwards,
  **then** it is refused: the catalog is fixed at startup.
- **Given** a widget type with a setting that allows a fixed set of values and a yes/no setting, **when** I open its form
  in the builder, **then** the first is a dropdown and the second a checkbox.
- **Given** an application-defined widget type, **when** it registers at startup, **then** it appears in the builder
  catalog and works exactly like the standard ones.

**Verified by:** `errors.feature`, `builder.feature`; 26 specification and 18 registry unit tests.

### WW-12 · Xsight Wirework - Delivered to other teams as versioned private packages

**Type:** Enabler · **Status:** Done · **Delivered:** 28 Sep (d1f0d1d, 70c6f56, 74ad148)

**Short description:** As a team that wants Wirework in our own application, we install it as versioned private packages
rather than copying source code, so that adoption is an install and upgrades are a version bump; one set of quality
rules applies to every package.

**Acceptance criteria:**

- All fifteen packages build for publication to the company's private registry; each has a README describing what it
  offers; the standard package-health check passes for every one.
- The packages are marked proprietary, for internal use only.
- The whole codebase passes the team's automated style and type checks with no exceptions.
- The demo works from the packages' source during development, so no build step is needed to develop or test.

**Verified by:** `pnpm build`, `pnpm lint:publish`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`.

### WW-13 · Xsight Wirework - Automated test suite in the company's browser: 439 unit tests, 85 widget showcase tests, 149 plain-language scenarios

**Type:** Quality · **Status:** Done · **Delivered:** 17 Sep (a680015), 21 Sep (950e9e1), 28 Sep (089985a, 13790d5,
53816ce), 29 Sep (8f70c9b)

**Short description:** As a product owner, every behaviour in this epic is covered by automated tests that run in about
1.5 minutes in Microsoft Edge, and the end-to-end scenarios are written in plain Given/When/Then that non-technical QA
can read and extend, so that regressions are caught before release and QA verifies acceptance criteria without code.

**Acceptance criteria:**

- The 149 scenarios read as plain-language steps ("Given I open the runs page, Then the table has 5 rows") and all
  pass; results are produced as an HTML report a tester can open.
- Every widget has a showcase page where a tester tries it with controls; each showcase doubles as an automated test.
- Scenarios never rely on fixed waiting times, so they do not fail at random; a scenario that must look at a page
  before its data arrives can hold the simulated server's answer.
- All browser tests run in the installed Microsoft Edge, the organisation's approved browser; nothing else is
  downloaded.
- The full suite finishes in about 1.5 minutes (it was 17 before the browser's shutdown issue was worked around).

**Verified by:** `pnpm test:unit`, `pnpm test:e2e`; reports in `e2e/reports/`.

### WW-14 · Xsight Wirework - Quality review and remediation: overall score from 72 to 86, design decisions written down

**Type:** Quality · **Status:** Done · **Delivered:** 21 Sep (b92296e), 22 Sep (58bbd19, a32fa94), 28 Sep (aa732d1,
70c6f56, 089985a, 1f4b2ed, 26bfdd6, c3f4a95, 39b8ca3)

**Short description:** As an engineering manager, I have a before-and-after assessment of the codebase around a
remediation, so that I know the maintainability risk; the defects the review found were fixed with a test each, and the
design decisions and coding guidelines are documented for new team members.

**Acceptance criteria:**

- Four dimensions were scored out of 100 before and after by the reviewer against the project's own guidelines: code
  quality 78 to 88, extensibility 72 to 85, readability 81 to 86, testing 58 to 84, overall 72 to 86 (a trend, not a
  certification).
- Every defect found was fixed and has a test that fails without the fix.
- The design decisions (how widgets take data, how events become reactions, how pages are specified and laid out), the
  coding guidelines and the server API examples are in `doc/`; a new developer can onboard from them.
- The items the review left open are listed in WW-15.

**Verified by:** the unit and e2e suites; `doc/guidelines.md`, `doc/*-design.md`.

### WW-15 · Xsight Wirework - Automatic quality check on every change, and the remaining improvements

**Type:** Quality · **Status:** To do

**Short description:** As an engineering manager, every change is checked automatically — all tests in Microsoft Edge —
before it can be merged, so that a broken build never reaches the demo or a release. Today the checks run only on a
developer's machine, because the previous pipeline was removed when the project moved towards its new home. The smaller
improvements the review and the table design left open follow, each becoming its own story when scheduled.

**Acceptance criteria:**

- A pipeline in the target environment runs the whole check (types, style, build, package health, unit tests with the
  showcases, end-to-end scenarios) on every push and pull request, installs Microsoft Edge, keeps the test reports and
  retries a scenario once before calling it a failure.
- Test coverage is measured and a threshold fails the check when it drops.
- The larger product follow-ups are stories of their own (WW-16 to WW-20); two small ones stay here until scheduled:
  dates and numbers displayed by their type without configuration, and a warning in the builder for a link column that
  leads nowhere.
- Engineering clean-ups: the last Edge-specific test gesture replaced by a keyboard pick; page editing operations as
  plain functions with their own tests; page events extensible by the host application; widget conformance tests moved
  beside the specifications.

### WW-16 · Xsight Wirework - Column editor in the builder: configure table columns without typing structured text

**Type:** User feature · **Status:** To do

**Short description:** As a page builder, I configure a table's columns in a form — hide, rename, choose how each column
displays — instead of typing structured text, so that configuring a list needs no technical knowledge and mistakes are
caught as I make them.

**Acceptance criteria:**

- **Given** a table wired to a server data address in the builder, **when** the server has described it, **then** the
  editor lists the columns with the server's names and which ones the server hides.
- **Given** the column list, **when** I untick a column, rename it or pick a display (text, status tag, link to a page,
  company-provided), **then** the table preview updates and the configuration is stored without me seeing its text.
- **Given** a display that needs details (the colour per status, the page a link opens), **when** I pick it, **then**
  the form asks for those details and refuses invalid ones with a message.
- **Given** a table configured as text today, **when** I open it in the editor, **then** its configuration appears in the
  form, and saving without edits changes nothing.
- **Given** an advanced user, **when** they open the "as text" view, **then** the same configuration is shown and edits
  there are reflected in the form.

### WW-17 · Xsight Wirework - Row actions: buttons on each table row

**Type:** User feature · **Status:** To do

**Short description:** As a page builder, I add actions to every row of a table — Open, Retry, Cancel — that trigger an
application action with that row's record or hand the record to other widgets, so that "do something with this record"
needs no custom widget.

**Acceptance criteria:**

- **Given** a table with row actions configured, **when** it renders, **then** every row shows the actions as buttons
  with the configured labels in an actions column.
- **Given** a row action wired to an application action, **when** I press it, **then** the action runs with the row's
  record, and the click does not select the row.
- **Given** a row action with a condition (only for Running runs, for example), **when** a row does not meet it,
  **then** the button is disabled and says why.
- **Given** the builder, **when** I configure a row action, **then** I pick its label and what it triggers from lists,
  as for any other event.
- **Given** keyboard use, **when** I move to a row, **then** its actions are reachable and operable with the keyboard.

### WW-18 · Xsight Wirework - Clear loading, empty and error states for every data request

**Type:** User feature · **Status:** To do

**Short description:** As a dashboard user, when data is loading, missing or failed to load I see it stated plainly — a
loading indicator, "No results", or a message with Retry — so that I never mistake a failure for an empty list or a
frozen page.

**Acceptance criteria:**

- **Given** a table whose server has not answered yet, **when** I look at it, **then** it shows a loading indicator and
  no stale rows.
- **Given** a request that returns no rows, **when** it completes, **then** the table says "No results" and the filters
  stay usable.
- **Given** a request that fails (server error, timeout, no network), **when** it completes, **then** the widget shows
  what failed and a Retry button, and the rest of the page keeps working.
- **Given** a Save the application rejects, **when** I press Save, **then** I see the reason and my changes stay on
  screen for another attempt.
- **Given** a widget wired to an application action that fails, **when** the action fails, **then** I see a message and
  the event log records the failure; nothing fails silently.

### WW-19 · Xsight Wirework - My personal view of a page is kept across reloads and devices

**Type:** User feature · **Status:** To do

**Short description:** As a dashboard user, the arrangement and settings I made for myself on a shared page are still
there after I reload or sign in on another device, so that personalizing a page is worth doing. The company's
application stores the view per user.

**Acceptance criteria:**

- **Given** I personalized a shared page, **when** I reload the browser, **then** my view is as I left it.
- **Given** I personalized a page on one device, **when** I sign in on another, **then** the same view appears.
- **Given** my personal view, **when** I press Reset to team page, **then** my changes are discarded and the shared page
  shows; the team's page is unaffected.
- **Given** the team changed the shared page (a widget removed), **when** I open it with my view, **then** my view
  applies where it still can and a notice names what no longer applies.
- **Given** an application that provides no storage for personal views, **when** I open a page, **then** the
  personal-view switch is unavailable with a reason, and nothing I did is lost silently.

### WW-20 · Xsight Wirework - Saved filter combinations: name a view of a list and return to it

**Type:** User feature · **Status:** To do

**Short description:** As a dashboard user, I save the filters and page size I use on a list under a name ("My failed
nightly runs") and return to it with one click, so that repetitive filtering is a one-time setup. Page builders can ship
such views ready-made with the page.

**Acceptance criteria:**

- **Given** the runs list with filters applied, **when** I press Save view and give it a name, **then** it appears in my
  Views list.
- **Given** a saved view, **when** I pick it, **then** its filters and page size apply and the list reloads from page 1.
- **Given** a saved view, **when** I rename or delete it, **then** the Views list reflects it; a view shipped with the
  page can be hidden but not deleted by me.
- **Given** a page builder configuring a table, **when** they declare named views, **then** every user sees them in the
  Views list.
- **Given** a saved view with a filter value the server no longer offers, **when** I pick it, **then** the list applies
  what still exists and tells me which filter was dropped.

### WW-21 · Xsight Wirework - Infinite list: a table that grows as you scroll, with its filters in the column headers

**Type:** User feature · **Status:** Done · **Delivered:** 23 Oct

**Short description:** As a dashboard user, I read a long list by scrolling — the table fetches the next rows from the
server when I reach its end, with no page numbers — and I filter and sort it from the column headers: a column with a
known set of values offers them as a list to tick, a free-text column shows a search icon that opens a box to type in,
and a click on a sortable header orders the list. As a page builder, I get all of this from one widget wired to the same
server data address as the paged table, so that a long list needs no filter bar and no pagination beside it.

**Acceptance criteria:**

- **Given** the History page, **when** it opens, **then** the first ten runs show with "10 of 23" under them; **when** I
  scroll to the end, **then** the next ten are appended ("20 of 23"), then the last three, and the first rows are still
  the first rows.
- **Given** the server describes Status and Inbound with values and calls Name filterable without values, **when** the
  table shows, **then** Status and Inbound carry a filter icon in their header, Name a search icon, and # and Reference
  no filter at all.
- **Given** the Status header's filter, **when** I tick Failed and press OK, **then** only failed runs are requested and
  shown with their count; **when** I reset it, **then** the whole list is back from its first rows.
- **Given** the Name header's search, **when** I type "suite" and press Enter, **then** the server is asked for names
  containing it and the one matching run shows; Reset brings the list back.
- **Given** the Name header, **when** I click it once, twice, three times, **then** the list is requested ascending,
  descending, then unordered, and the first row changes accordingly.
- **Given** the builder, **when** I add an infinite table wired to the runs data address with "more" set to append,
  **then** it loads by itself and grows when scrolled, like the one on the History page.
- **Given** a server that has no more rows than the table holds, **when** I reach the end, **then** nothing is asked for.

**Verified by:** `infinite-table.feature` (8 scenarios), the `antd-infinite-table` stories (the `table` conformance set
plus header filter, search, sort and "more"), the loader unit tests for `more` and `filterLike`, `columnsOf` tests for
what a header filters and sorts by.

### WW-22 · Xsight Wirework - Several views of a page: the team's prebuilt layouts and my own, chosen from one list, shared as JSON

**Type:** User feature · **Status:** Done · **Delivered:** 24 Oct

**Short description:** As a dashboard user, I pick the view of a page from one list — the layouts the team ships
("prebuilt") and the ones I saved for myself ("mine"), each labelled so I see which is which — and I keep as many of my
own as I like: Save as copies the view on screen under a name, Rename and Delete tend my own, Share shows a view as a
text I send to a colleague, who imports it with Import. As an administrator, I ship an alternative layout of a page by
saving a view with the personal overlay off: it appears as prebuilt for everyone. As a team embedding Wirework, I get
the list, the actions and the file format as a hook, a component and plain functions, and decide myself where views are
stored. Designed with the tiger team (`doc/page-views-design.md`).

**Acceptance criteria:**

- **Given** the overview page, **when** I open the view list, **then** it offers "default" and "compact", both labelled
  prebuilt; **when** I choose "compact", **then** the page shows that layout, and "default" brings the full page back.
- **Given** a view on screen, **when** I press Save as and give it a name, **then** the page shows my new view, labelled
  mine, and my later edits change it alone; switching to a team view and back keeps both as they were, also after a
  visit to another page.
- **Given** my own view on screen, **when** I rename it, **then** the list shows the new name only; **when** I delete
  it, **then** the page shows the team's default again. A team view can be neither renamed nor deleted.
- **Given** a name another view already has, or one with a dot, **when** I save, **then** the panel says why and nothing
  changes.
- **Given** a view on screen, **when** I press Share, **then** I see it as a JSON text that names its page, its name and
  its layout; **when** a colleague pastes that text under Import, **then** it becomes one of their own views, under the
  file's name or one they type.
- **Given** a text that is not a view, a view of another page, or a name in use, **when** I import it, **then** the
  panel says which it is and nothing changes.
- **Given** the builder with the personal overlay off, **when** I save the page as a view, **then** it is prebuilt: with
  the overlay on it is in the list for everyone, labelled prebuilt.
- **Given** a user without the editing permission, **when** they look at the view list, **then** they can choose any
  view but Save as and Import are unavailable, with the reason.
- **Given** I edit a prebuilt view with my overlay on while I already have a "my-own" view, **when** I save the page,
  **then** my edit becomes "my-own-2" and "my-own" is untouched.

**Verified by:** `page-views.feature` (10 scenarios), the `PageViews` stories (choosing, saving as, sharing and
importing, without permission, overlay off), the `usePageViews` hook tests (14), the pure view-list and file-format
tests, the tree-function tests in the engine, the numbered-copy test of `usePageEditing`.

### WW-23 · Xsight Wirework - The infinite list as a virtual list, and header filters on the paged table too

**Type:** User feature · **Status:** Done · **Delivered:** 24 Oct

**Short description:** As a dashboard user, I scroll a list of thousands of rows as smoothly as one of ten: the
infinite list keeps every row it has fetched but draws only the ones around what I see — twice the height of its box
— with blank space standing in for the rest, so the scrollbar, the end of the list and "load more" behave exactly as
before. As a page builder, I turn on the same header filters and header sorting the infinite list has for an ordinary
paged table with one setting, and a value ticked in a header shows in the filter bar beside it, and the other way
round: one choice, two places to make it. Designed with the tiger team (`doc/row-window-design.md`).

**Acceptance criteria:**

- **Given** the History page with 23 runs loaded, **when** I look at what is drawn, **then** fewer rows are in the
  page than the list holds, the status line still says "23 of 23", and **when** I scroll back to the top, **then** the
  first row is the first run again.
- **Given** the History page, **when** it opens and I scroll to its end twice, **then** the list grows to 20 and 23
  rows exactly as before — the window changes nothing about when more rows are asked for.
- **Given** a list of two hundred rows in a 240-pixel box, **when** it shows, **then** the first row is on screen and the
  last is not; **when** I scroll to the end, **then** the last row is on screen and the first is not, and never more
  than a few dozen rows are drawn.
- **Given** the History page, **when** I press End with the list focused, **then** it scrolls to its bottom and asks
  for more rows like a mouse scroll does; **when** I press End again at the real end, **then** the last run is the last
  row drawn; **when** I press Home, **then** the first run is back — the keyboard works the list without a mouse.
- **Given** the runs page, **when** I look at its table, **then** Name and Status carry a filter icon in their headers
  (Name offering the page's three suites, as the filter bar's Suite does) and Reference none.
- **Given** the runs page on its second page, **when** I tick Failed in the Status header and press OK, **then** the
  filter bar's Status shows Failed too, the list is back on page 1 and counts the failed runs; **when** I unpick Failed
  in the bar, **then** all runs are back.
- **Given** the runs page, **when** I click the Name header, **then** the server is asked for the list by name,
  ascending.
- **Given** a paged table without the setting, **when** its columns say what they filter by, **then** its headers are
  plain: no icon, no sorting — every page built so far looks as it did.

**Verified by:** `infinite-table.feature` (the window scenario and "The keyboard scrolls the list too"),
`table-view.feature` ("A header filter on the paged table"), the `antd-infinite-table` `Window` story (the box takes
the focus), the `antd-table` `HeaderFilters` and `HeadersOff` stories, the
`rowWindow` unit tests (8).

### WW-24 · Xsight Wirework - A control stores its own value without wiring; several reactions per event, in order

**Type:** User feature · **Status:** Done · **Delivered:** 1 Nov

**Short description:** As a page builder, I add a text field, a checkbox, a dropdown, a pager or a counter and it
works at once: what the user types or picks is stored where the widget reads it, by default, with nothing to wire — the
builder shows me that default and lets me add what should happen NEXT. Every event now takes a list of reactions I
can add to, reorder by adding in order, and remove one by one, in the builder and when editing a placed widget; the
old editor showed one and only kept the rest. A widget's specification says which of its inputs an event writes back
to, so every implementation behaves the same and a configuration that forgets the write can no longer break a widget.

**Acceptance criteria:**

- **Given** the builder, **when** I choose a counter, **then** the form says its `incremented` event sets the counter's
  own path by default, offers no reaction to fill, and Add is enabled; **when** I add it and click it twice, **then** it
  shows 2.
- **Given** the builder, **when** I choose a checkbox and add two reactions after its default — an application action,
  then a write of the choice to a second path — and remove a third, blank one, **then** the form lists two reactions;
  **when** I add the widget and tick it, **then** the box is checked, both paths hold true, and the saved page holds the
  two reactions and not the default write.
- **Given** the builder, **when** I choose a refresher, **then** its schedule is written back by default but Add stays
  disabled until its `refresh` event, which has no default, calls an action.
- **Given** the runs page with the overlay off, **when** I edit the pager, **then** the editor shows "page" written back
  by default and the two reactions that follow (the page size, the request); **when** I save, **then** page 2 still
  requests page 2.
- **Given** a text field whose port I move to another path in the builder, **then** the default follows the new path
  at once; a reaction I typed that repeats the default is not saved, so the page cannot write a stale path later.
- **Given** a widget specification whose event claims to write back to an input it does not have, **when** the
  application starts, **then** it is refused with the port named; an implementation that disagrees with its
  specification on that point is refused too.

**Verified by:** `builder.feature` ("Added widgets are wired together through inputs and reactions", "A widget cannot
be added until required ports and reactions are bound", "A controlled widget stores its value by default, and more
reactions follow in order"), `events.feature` ("The counter's own write is its default reaction, not widget code",
"Editing the paginator on the shared page keeps its whole reaction chain"), the `WidgetBuilder` `WritesBackByDefault`
and `WaitsForTheWiring` stories, the engine's "default write-back" and registry tests, the builder's form tests.

### WW-25 · Xsight Wirework - Show a widget only when a condition holds: ready-made checks, and the application's own

**Type:** User feature · **Status:** Done · **Delivered:** 1 Nov (designed with the tiger team the same day,
doc/conditions-design.md)

**Short description:** As a page builder, I say when a widget shows — "show the error line only when there is an
error", "show Open run only while a run is selected", "show Retry only to admins, on a failed run" — from the builder's
form, in words, without code. A condition reads one value from the page's data and applies a named check: empty, true,
false, equals, one of, contains, greater than, less than; several conditions must all hold, and a line can say "one
of these". The application's developers add checks of their own under a name (a run that can be retried), and the
builder offers them next to the ready-made ones. A hidden widget keeps its place on the page and comes back as it was;
while I edit the page it stays visible, dimmed, with the reason it would be hidden.

**Acceptance criteria:**

- **Given** the runs page, **when** it opens, **then** "Open run" is hidden; **when** I click a row, **then** it is
  shown; **when** the selection is cleared, **then** it is hidden again.
- **Given** the run page of a run that does not exist, **when** the server has answered, **then** the error line is
  shown with the server's message; on an existing run it is hidden.
- **Given** the builder, **when** I choose a label, give it a text and say "show when `demo.count` is greater than
  10", **then** the form reads the condition back as a sentence and Add is enabled; **when** I add the widget, **then**
  its cell is hidden until the page's data says 11 or more, and shown after.
- **Given** a condition whose value the check refuses (a word where a number is needed), **when** I type it,
  **then** Add is disabled and the row says why; **given** a page whose configuration names a check that does not
  exist, **when** it renders, **then** that cell shows a problem naming the registered checks and the page stands.
- **Given** the page in edit mode, **when** a widget's condition does not hold, **then** the widget is still shown,
  dimmed, with "hidden now: …" and its Edit button works.
- **Given** a check the application registered (a run that can be retried), **when** I pick it in the builder,
  **then** it is offered by its description under the application's name, and a widget using it shows and hides as the
  application's rule says.
- **Given** a condition the rows cannot say, **when** I pick "constructor" and build it step by step — a condition,
  "and", a group in parentheses with two conditions joined by "or" — **then** the form reads the result back as a
  sentence ("when demo.count is greater than 10 and (demo.error is empty or demo.force is true)"), Add waits until
  every condition is finished, and the widget shows and hides as the sentence says; **when** I edit the widget later,
  **then** the same groups and conditions come back and can be built on. Parentheses, "and"/"or" and "not" each have
  a colour of their own, so a built condition is read at a glance.
- **Given** a widget with a condition, **when** I pick an appearance ("slide up") under it, **then** the widget slides
  in each time its condition turns true; without one it simply shows. **When** I pick a disappearance too, **then**
  the widget plays it on its way out and is gone when it ends; the list holds the five standard animations and the
  ones the application registered under names of its own (the demo's "drop", on the run page's retry tag).
- **Given** my personal view of a page, **then** I cannot change the page's conditions (they are the page's wiring, like
  its data bindings), and the widgets hidden by the page stay hidden in my view.

**Verified by:** `conditions.feature` (all nine scenarios), `app.feature` ("Nothing opens while no run is selected —
the button is not even shown"), `overlay.feature` and `builder-overlay.feature` ("keeps inputs and reactions
read-only" now covers conditions), the `WidgetBuilder` `ShowsWhen` story, the React adapter's `PageView` ("a cell with
a condition") and `useWhen` tests, the engine's `predicates.test.ts`, the schema's `when.test.ts`, the builder's
`form-when.test.ts` and `use-widget-builder.test.tsx`.

### WW-26 · Xsight Wirework - Six more ready-made widgets: switch, slider, radio group, rating, statistic and divider

**Type:** User feature · **Status:** Done · **Delivered:** 2 Nov

**Short description:** As a page builder, I have six more widgets from the company's standard look to assemble pages
with — an on/off switch, a slider along a range, a radio group for a few options side by side, a star rating, a large
statistic with its title, and a divider with a title on the line — each a specification any implementation must
match, each storing what the user picks without wiring, each with a live preview in the builder.

**Acceptance criteria:**

- **Given** the builder, **when** I open the palette, **then** every new widget shows a live preview with sample data.
- **Given** a switch, a radio group, a rating and a slider added in the builder and bound to paths, **when** I flip
  the switch, pick an option, pick a star and nudge the slider with the keyboard, **then** each stores what I chose
  at its path, with nothing wired by hand.
- **Given** a statistic bound to a number and a divider with a title, **when** the page shows, **then** the statistic
  shows the number with its digits grouped under its title, and the divider shows the title on its line.
- **Given** another implementation of any of the six, **when** its conformance stories run, **then** they say whether
  it behaves as the specification requires.

**Verified by:** `more-widgets.feature`, the six widgets' conformance stories (`switchConformance`,
`sliderConformance`, `radioGroupConformance`, `rateConformance`, `statisticConformance`, `dividerConformance`) and
playgrounds, the engine's standard-contracts test.

### WW-27 · Xsight Wirework - Containers: a card, tabs and panels that hold other widgets, added in the builder

**Type:** User feature · **Status:** Done (designed and built 2 Nov, doc/containers-design.md)

**Short description:** As a page builder, I add a card with a title to a page and put widgets inside it — a table and
its filter, a counter and what shows it — and tabs with a layout per tab and panels that fold, so that a page has
structure without a developer. A container holds a small layout of its own, kept inside the container's own
configuration — a card with two buttons and an input holds those three widgets on its own little grid, three cards on
one screen are three such layouts, and the screen is still one page that is shared as one — which I edit the way I
edit a page, with the same palette and the same form, and come back by a breadcrumb. "Wrap in a card" puts a title
around a widget already placed.

**Acceptance criteria:**

- **Given** the settings page, **when** it opens, **then** the name input, the page-size select and the auto-refresh
  checkbox sit inside a card titled "Preferences", and typing a name or ticking the box changes the settings as before.
- **Given** the builder, **when** I add a card, **then** it takes a cell twice the usual height and OPENS at once: the
  breadcrumb reads "builder › custom-1" and its empty layout is the page; **when** I add a label there and follow the
  breadcrumb back, **then** the label shows inside the card; **when** I edit the page and follow "Edit content",
  **then** the card's layout is the page again, in edit mode, its widgets ready to move and resize; after Save page,
  ready for another widget.
- **Given** a card just added, **when** I pick another layout engine before placing anything inside, **then** the
  card's content runs on that engine while the page keeps its own; once a widget is inside, the choice is locked.
- **Given** a placed counter in edit mode, **when** I choose "Wrap in a card" and save the page, **then** the counter
  sits inside a new card, wired as before.
- **Given** a page with a card, **when** I share its view, **then** the view names the card and nothing inside it: the
  card's content is the page's configuration, which every user has.
- **Given** a card nested five deep, **when** the page renders, **then** that card shows the problem and the rest of
  the page stands; the application's start-up check reports it too.
- **Given** tabs with a layout per tab, **when** I switch tabs, **then** each tab's widgets appear when first shown
  and keep what they had after; panels that fold do the same when unfolded.
- **Given** the builder, **when** I choose tabs, **then** the form shows one tab to name; **when** I name it "Runs",
  add one more named "History" and add the widget, **then** the tabs read Runs and History and the widget opens on
  the first tab's layout; **when** I edit the widget, add a tab "More", remove "Runs" and save, **then** the tabs read
  History and More, and the new tab has an empty layout of its own to fill.
- **Given** a demo page with my overlay on, **when** I edit the page and open a card's content, **then** I lay out the
  widgets inside as I do a page — move them, give them classes, change their settings — and save; **then** the card
  shows my layout and my settings while my overlay is on, and the shared page's own when it is off (added 3 November
  2026 at the product owner's ask).

**Delivered:** 2 November 2026; the user's own layout inside a card 3 November 2026.

**Verified by:** `containers.feature` (the settings card and its controls, the shared view, the palette previews, the
builder's card opened on Add and filled, then reopened through "Edit content", tabs named and added in the form, "Wrap in
a card", a card's content edited into the user's own overlay with the shared page untouched); the `antd-card`, `antd-tabs` and `antd-collapse`
stories with their conformance sets; the adapter's `NestedLayout` tests (the live store inside, the preview outside,
the depth limit); the engine's `nesting` tests (the layouts a view model holds, the overlay chain key, the registry's
check of `contains`, boot validation into layouts and the depth refusal); the builder's `use-page-editing` and
`use-builder` tests (the location, wrap, removal walking inside a container).

### WW-28 · Xsight Wirework - Flex rows: lay widgets out with Tailwind's layout classes, and a page of two cards

**Type:** User feature · **Status:** Done (designed and built 3 Nov, doc/flex-rows-design.md)

**Short description:** As a page builder who knows Tailwind, I lay a page out in rows of a flexbox each and say in
Tailwind's own words how a row distributes its widgets and how a widget grows, shrinks, sizes, aligns and spaces
itself — `flex-1`, `basis-1/3 shrink-0`, `w-2/3`, `justify-between items-center gap-4`, `grid grid-cols-3`, `self-end`,
`order-last`, `p-4`, `-mt-2`, `w-[320px]`: all of Tailwind's layout, flexbox and grid, spacing and sizing classes — so
that I get the power of CSS layout without a developer and without learning a grammar of this product's own. I move a widget between rows with
arrows, type its classes in a field that suggests the names, and see the page change at once; a name the product does
not know is flagged and does nothing. A demo page shows two cards side by side as the panes of a docking layout
(FlexLayout), one holding a grid inside, the other flex rows, both with live widgets: three layout engines on one page.

**Acceptance criteria:**

- **Given** the cards page, **when** it opens, **then** two cards stand side by side as the panes of a docking layout,
  the counter card on a grid inside and the profile card on flex rows inside, where the name field takes its row and
  the switch keeps its size; clicking the counter moves the statistic, Reset puts it back, the name typed in the
  profile card is greeted below and the switch writes the global setting.
- **Given** the profile card's row of three buttons of different sizes ("basis-32 grow", "flex-none basis-24",
  "flex-none basis-20"), **then** they stand side by side, each narrower than the one before; **when** I click Alice,
  Bob or Clear, **then** the field and the greeting show that name; **when** the window narrows so the card has no
  room for them all, **then** the buttons that no longer fit go to the next line of their row, and come back when the
  room does.
- **Given** a page on flex rows with my overlay on, **when** I change a cell's classes to "basis-1/2 self-end" and
  save, **then** the change is in my own view and survives the save, and with the overlay off the shared page shows
  the cell without them.
- **Given** the builder on flex rows with two widgets added, **then** each has a row of its own; **when** I press the
  second one's ↑, **then** both share one row side by side; **when** I press its ←, **then** it comes first; **when** I
  give the row "justify-between" and the first cell "flex-none self-center" and save, **then** the saved page holds
  both and the cells show no edit chrome.
- **Given** a cell whose classes name something the product does not know ("bg-red-500"), **then** the field is marked
  invalid and the page warns which class, and the warning goes when the class is corrected.
- **Given** a card on flex rows, **when** I open its content through "Edit content", **then** it is edited as the page
  — rows, arrows and classes — and the breadcrumb leads back.

**Delivered:** 3 November 2026.

**Verified by:** `flex-rows.feature` (the cards page, its three engines and its widgets, the profile card's row of
buttons measured and wrapping as the window narrows, classes saved into the user's own view, cells moved and classed in
the builder, the unknown class, a card's flex content edited as the page); the engine's unit tests (`engine.test.ts`:
the promises, rows appended and dropped, classes set and cleared, every move, `validate`; `classes.test.ts`: Tailwind's
names and values, the three names Tailwind 4.3.4 lacks kept out, the merge, the strangers).

### WW-29 · Xsight Wirework - Pages as code: a page built in the builder lands in the application's source

**Type:** User feature · **Status:** To do (designed 4 November 2026, doc/pages-as-code-design.md; phase 1's loader
built 9 November 2026: every demo page is a folder `src/pages/<page>/` — `page.json`, `viewModel.json` with the layouts
nested like HTML (a card's inside in the card's cell), `roles.json` what every role says (`{}` where none), `widgets.json` — read at
boot, and the store holds one page's view models at a time, loaded when the page opens; Export page downloads the same
nested shape; `pages-as-code.feature`, "A page's view models come from its folder")

**Short description:** As an admin, I build a page in the builder — a new page with its own address and menu entry, or
a change to an existing one — and when I save it, it is written as a page file in the application's source, so that it
reaches every user through the application's normal release, with a reviewer and a history, and without a developer
typing it in. I work in an AUTHORING copy of the application; every Save page writes the page's file; the toolbar
tells me where it went; a developer (later: a button) turns the change into a pull request that the automatic checks
validate. In production nobody writes the shared pages; personal views keep working.

**Acceptance criteria:**

- **Given** the application in authoring mode, **when** I open the builder, choose "New page", name it "Inventory"
  and give it the address /demo/inventory in the menu, **then** an empty page opens on the default engine, which I may
  change while it is empty.
- **Given** a page I am building, **when** I add widgets and save the page, **then** the toolbar says the page was
  saved to its file (`src/pages/inventory.page.json`), the page is in the menu at its address, and it looks to me as
  it will to its users, my personal view on or off.
- **Given** a saved page file, **when** the application starts again, **then** the page is there as saved — its
  layouts, the widgets inside its cards, its prebuilt views and what it loads.
- **Given** a page file that names a widget, an engine or an action the application does not have, **when** the
  automatic checks run, **then** they fail naming the file and the problem, before any user sees the page.
- **Given** the application in production, **then** the builder cannot write the shared pages, and my personal view
  of a page is saved as today.
- **Given** a saved page (phase 3), **when** I press "Propose", **then** a pull request with my page file opens and
  its link shows in the toolbar.

**Verified by (planned):** `pages-as-code.feature` (its first scenarios are WW-30's); the engine's `pages-file` tests
(a page cut into a file and merged back for every demo page, conflicting widget templates reported, the name rule); the
dev-server plugin's handler test; the configuration check run by CI.

### WW-30 · Xsight Wirework - Export a page as one JSON file to hand to a developer

**Type:** User feature · **Status:** Done (built 5 Nov, doc/pages-as-code-design.md "Built")

**Short description:** As an admin — a product owner, a QA, a developer of another team — I build or change a page in
the builder and export the WHOLE page as one JSON file, `<page>.page.json`, so that I can send it to a developer, who
puts it in the application's source and ships it with the next release, without typing my page in. The file holds
everything the page is as configuration: its prebuilt views, what it loads when it opens, every widget its cells use
down into its cards and tabs, and its address and menu entry. My own personal view is never in it: the file is the
shared page. Exporting is an administrator's act and waits for the editing permission, like Edit page. This is the
first step of WW-29 (pages as code): the file an admin exports today is the file the authoring mode will write by
itself tomorrow, and the developer's merge of it into the application is a function the engine provides.

**Acceptance criteria:**

- **Given** the overview page, **when** I press Export page, **then** a panel shows the page as JSON — kind
  `wirework-page`, the page's name and address, both prebuilt views, its `load` reaction and its widgets — and
  **when** I press Download, **then** the browser saves `overview.page.json` holding that page.
- **Given** I saved a view of my own, **when** I export the page, **then** my view is not in the file.
- **Given** the cards page — two cards as docking panes, a grid in one and flex rows in the other — **when** I export
  it, **then** the file holds the widgets inside both cards, three layout engines deep.
- **Given** a page I built in the builder with a label, **when** I export it, **then** the file holds the label's cell
  and its template with the text I typed.
- **Given** my permissions do not include editing pages, **then** Export page is disabled and says why on hover.
- **Given** an exported file, **when** a developer merges it into the application's view models with the engine's
  function, **then** the result validates exactly as the page did, and two files that hold the same widget template
  differently are reported by name.

**Delivered:** 5 November 2026.

**Verified by:** `pages-as-code.feature` (the overview exported whole and downloaded, my own view left out, the cards
page three engines deep, a page built in the builder, no export without the permission); the engine's
`pages-file.test.ts` (the cut through a container, export and parse, merge into a tree that validates like the
original and over another tree, the two conflicts); the builder's `use-page-export.test.tsx` (the file, the panel, the
download through `save`, the lock).

### WW-31 · Xsight Wirework - Roles: one page that differs for an admin — extra filters, other actions, a card of their own

**Type:** User feature · **Status:** Done (designed 5 November 2026, doc/roles-design.md; built 6 November 2026)

**Short description:** As a page builder, I make one page look like each user's job: an admin opening the runs page
gets an extra Owner filter and a table that loads every owner's runs through the admin's request, and a Retry tag the
others never see, and a Danger-zone card on the settings page; a Wirework admin gets the admin's runs page with a Delete
button and a settings page with a Sessions card on top — while everybody else gets the page as it is, with no blank
where those widgets would be. I
configure it in one place per role: which view of the page a role sees,
which template a widget uses for that role (the admin's table template carries the admin's load action and its
filter), and the settings a role changes. To hide one widget for a role I keep using "Show when" with the user's
roles. What the server answers stays the server's decision from the session: a role changes what the page shows and
asks for, never what a user is allowed to receive.

**Acceptance criteria:**

- **Given** I am signed in as QA, **when** I open the runs page, **then** the table loads the runs view with its four
  columns; **when** I sign in as admin, **then** the table loads the admin's view of every owner's runs, with an Owner
  column and an Owner filter the server offers, and choosing an owner re-requests the list with that owner; **when** I
  sign in as QA again, **then** the page is the page as it is, the owner choice gone with it.
- **Given** the settings page, **then** as QA it holds the four cells it has today, with no blank for anyone's card;
  **when** I sign in as admin, **then** it holds the Danger-zone card too, whose button puts every setting back.
- **Given** I hold several roles — QA, admin and Wirework admin, as the session lists them from the broadest to the most
  specific — **when** I open the runs page, **then** I see the admin's table with the Wirework admin's Delete button
  shown once a run is selected (the single-widget case, written as a condition "the user's roles has the role …"), and
  deleting removes the run from the list; **when** I open the settings page, **then** I see the Wirework admin's view
  with both cards, the Sessions card listing the signed-in people from the server: the most specific role that says
  something about a page wins there, and the others' pages stay as they are.
- **Given** I saved a personal view of a page as QA, **when** I am signed in as admin, **then** my view is still mine
  and still shown; **when** I choose no view, **then** I see the admin's page; and **when** I edit the admin's page I
  see, **then** the edit is my own copy of it, the admin's view and the shared page untouched.
- **Given** the builder with "edits → role: admin", **when** I move a cell, save a view or pick a widget's template and
  save, **then** the change is in the admin's configuration, the shared page is untouched, and the page shown while I
  edit is the page as an admin sees it.
- **Given** the builder page, **then** it offers the roles `app-user` and `admin` from the start; **when** I type a
  new role's name into "add a role" and press Enter, **then** it is on offer and I can edit for it; a name that is not
  kebab-case, or a role already there, is refused with the reason (added 9 November 2026).
- **Given** a page with a widget for everyone, **when** I edit for the role `admin` and add a widget, **then** the
  admin's page shows both in a view of the admin's own, and everyone else's page still shows the one (added
  9 November 2026).
- **Given** a role's configuration that names a view or a widget template nobody has, **when** the application starts,
  **then** the validation names the role, the page and the missing name, and a role the application does not grant is a
  warning.
- **Given** a QA session, **when** the admin's request is sent anyway — or the Wirework admin's deletion —, **then** the
  server refuses it: the role decides the page, the session decides the data.

**Delivered:** 6 November 2026. Reviewed by the tiger team on 7 November 2026 and amended: the conflict warning of the
design was dropped (it fired on the intended case, a stronger role overriding a weaker one on the same page), the
Danger-zone card returned to the admin, the Owner filter is the server's own in the filter bar, Delete is a server
call, and Retry stayed everyone's.

**Verified by:** `roles.feature` (9 scenarios: the runs table as QA, as admin and as QA again, the refused request, the
admin's Danger zone, the Wirework admin's two pages with the deletion, a personal view surviving the sign-in and an
admin's edit of the role's page as their own copy, editing for a role in the builder, a template chosen for a role, the
validation's warnings); the engine's role tests in `resolve.test.ts`, `validate.test.ts`, `trees.test.ts`,
`nesting.test.ts` and `pages-file.test.ts`; the React adapter's role tests; the builder's role tests in
`use-page-editing.test.tsx`, `use-page-views.test.tsx` and `page-views.test.ts`; the toolbar story `ForARole`.

### WW-32 · Xsight Wirework - CSS grid: a page laid out by template areas, filled from a typed form

**Type:** User feature · **Status:** Done (designed and built 7 November 2026, doc/css-grid-design.md)

**Short description:** As a page builder, I lay a page out as a GRID of named slots — a picture of rows where each
slot holds one widget, and a widget spanning several slots is one area — the way a page's skeleton is drawn: the name
over two columns, the back button in the third, a sidebar beside three rows of content. Every widget is known by its
own id, and I draw the picture by dragging a widget onto the slot where it starts and pulling its corner over the
slots it spans — on the page itself, with the real column sizes, a slot another widget holds refusing — or fill it
from a form that can only hold what exists: a select per slot listing the page's widgets. I size the columns and rows
in the same form, as a number with a unit (a fraction of the room, pixels, rem, percent) or a keyword. No class
strings; the saved page is the picture itself, which a colleague reads. The run page shows it.

**Acceptance criteria:**

- **Given** the run page, **when** it opens, **then** it renders on the css-grid engine: the run's name spans the
  first two columns with the Back button in the third, the status, reference and message share the second row, the
  error line spans two columns with the Retry tag beside it; every widget behaves as before and the hidden ones leave
  their slot empty.
- **Given** the builder with css-grid picked while the page is empty, **when** I add two widgets, **then** each takes a
  row of its own across the grid; **when** I drag the second one past the right edge onto row 1, **then** the grid has
  a second column, the two stand side by side and row 2 is empty; **when** I remove row 2, **then** the grid has one
  row; **when** I pull the second widget's corner one slot down, **then** it spans two rows.
- **Given** a widget dragged onto a slot another widget holds, **then** the slot shows red with the reason, the drop
  is refused and the picture is as it was.
- **Given** a slot's select, **then** it offers only the page's widgets and "empty"; **when** I pick the same widget
  in two neighbouring slots, **then** it spans them; **when** I pick it in three slots that make an L, **then** the
  slots are marked and the page warns that the area is not a rectangle, and the warning goes when the picture is
  rectangles again.
- **Given** a column's size field, **when** I give column 2 the number 12 and the unit rem and save, **then** the
  column is 12rem wide and the saved page holds it; **when** I give column 1 the number 2 and the unit fr, **then** it
  is twice as wide as a column of 1fr; the field offers only units and keywords the browser knows.
- **Given** a row whose only widget has no other slot, **when** I try to remove the row, **then** the button refuses
  and says why on hover.
- **Given** a card whose content runs on css-grid, **when** I open it through "Edit content", **then** its slots and
  sizes are edited as the page, with the breadcrumb back.
- **Given** a page on css-grid with my overlay on, **when** I change the picture and save, **then** the change is in
  my own view, and with the overlay off the shared page shows the original; editing for a role, the role's.

**Verified by:** `css-grid.feature` (7 scenarios: the run page as a skeleton with a hidden widget keeping its slot,
the cards page's third card on a CSS grid below the two with the signed-in person changing on "Sign in as",
two widgets added each taking a row and a drop past the edge growing the grid then a resize spanning two rows, a
drop refused where another widget holds the slot, the slot table filling the same picture with the L marked and
warned then cleared, the typed sizes in rem and fr and a keyword saved, a card's content on css-grid edited as the
page); the engine's unit tests in `packages/engine-css-grid` (the promises of the contract, append and remove, the
two change kinds, every validation sentence, the rectangle rule on an L, a T, two islands and a hole, a drop placed
and refused, the grid grown and shrunk, the track sizes); the run page's scenarios in `conditions.feature` and
`app.feature` unchanged.

### WW-33 · Xsight Wirework - Documentation for page authors: an AI agent builds a page from a one-sentence ask

**Type:** Enabler · **Status:** To do (designed 7 November 2026, doc/page-authoring-docs-design.md)

**Short description:** As a team that embeds Wirework in its application, I want anyone — and above all the AI coding
agents we already use — to be able to add a page without a developer explaining the library: one entry file every
agent finds (`AGENTS.md`), a short guide to the page model and its ten rules, a catalog of exactly the widgets,
actions, checks and layout engines THIS application has registered — generated from the code, so it is never out of
date —, the six demo pages as readable example files with a note on what each cell proves, and one command that tells
the author what the application would refuse before it is ever run. The rule of the set: what an author must get
exactly right is generated or tested; prose carries only the model.

**Acceptance criteria:**

- **Given** the repository, **when** I open `AGENTS.md`, **then** in under sixty lines it says what Wirework is, in
  which order to read, the ten rules of a page, the two commands, and where the host's own code is — and sends
  maintainers of the library to CLAUDE.md.
- **Given** `doc/authoring/page-authoring.md`, **when** I read it, **then** every section of a page file (a cell, a
  widget template with its settings, inputs, reactions, condition and appearance, the store paths, the engines, a
  container, the check) is explained in a few lines with one JSON fragment, and no widget's settings are described
  there — the catalog is.
- **Given** `pnpm docs`, **when** it runs, **then** `doc/authoring/catalog.md` lists every registered widget with its
  settings (kind, default, description), inputs and events, every action with its parameters, every predicate with its
  phrase, every appearance and every layout engine with the fields a cell carries — read from the registries, the same
  source as the builder's form —, `wirework-page.schema.json` describes the page file with the registered engines'
  templates and says in words what it cannot check, and `doc/authoring/examples/` holds the six demo pages as page
  files; **when** a registration or a fixture changes and the folder is not regenerated, **then** `pnpm check` fails.
- **Given** a page file with an unknown widget and a reaction writing a forbidden path, **when** I run
  `pnpm pages:check` on it, **then** it prints the two problems as sentences with the file's name, and exits with 1;
  **given** the six examples, **then** it prints no error.
- **Given** `doc/authoring/examples/README.md`, **then** every cell it names exists in the file it names (a unit test).
- **Given** an AI agent that is handed only `AGENTS.md` and `doc/authoring/` and asked in one sentence for a new
  page, **when** it writes the page file and runs the check, **then** the file is accepted on the first or second
  try — a trial run at the end of phase 2, its transcript kept with the story.

**Verified by:** to be written — `catalog.test.ts` in the engine, `docs.test.ts` and the check command's test in the
playground, and the trial's transcript.

### WW-34 · Xsight Wirework - Eight more ready-made widgets: number, date, date range, fact sheet, result, dialog, steps and timeline

**Type:** User feature · **Status:** Done (designed and built 9 November 2026, doc/more-widgets-design.md; the
repeater design the team asked for between the phases is still to be held)

**Short description:** As a page builder, I have the widgets a dashboard still lacks from the company's standard look:
a number field, a date and a date-range picker, a fact sheet that shows one record as labelled fields in the table's
own cell kinds, a result that says what happened and offers a way on, a dialog (a drawer or a modal) holding a layout
of other widgets, a pipeline of steps and a timeline — plus a long-text field and a confirmation before a destructive
button as two settings on widgets that exist. Each is a specification any implementation must match, each stores what
the user picks without wiring, each shows on a demo page, not only in the palette.

**Acceptance criteria:**

- **Given** the builder, **when** I open the palette, **then** every new widget shows a live preview with sample data.
- **Given** a number field, a date picker and a date-range picker bound to paths, **when** I enter a number, type a date
  and type two dates, **then** each stores what I entered at its path as plain text (a date as `2026-11-09`, never as
  a browser date object), with nothing wired by hand, and a date's display format never changes what is stored.
- **Given** the runs page, **when** I pick "Started between" two dates, **then** the list shows only the runs started
  between them, and the server was asked with that range.
- **Given** the run page, **when** it opens, **then** one fact sheet shows the run's status as a coloured tag, its
  reference with the company's copy button, its message and its inbound flag — the same cell kinds the runs table
  uses —, the pipeline shows the current step, and the timeline the run's history; **when** the run does not exist,
  **then** a result says so and offers "Back to runs".
- **Given** the Delete run button, **when** I press it, **then** it asks "Delete this run?" and deletes only after I
  confirm; **when** I cancel, **then** nothing happens.
- **Given** Retry on a failed run, **when** I press it, **then** a dialog opens with a reason field of several lines
  and a Retry button; **when** I confirm, **then** the run is retried and the dialog closes; **when** I press Escape,
  **then** it closes with nothing done.
- **Given** the builder and a dialog added to a page, **when** I edit its content, **then** the layout inside is
  edited like a card's, and the dialog shows open and in place while the page is being edited.
- **Given** another implementation of any of the eight, **when** its conformance stories run, **then** they say
  whether it behaves as the specification requires.
- **Given** the roles page, **when** I open it as a QA, **then** I see one card with a note field; **when** I sign
  in as an admin, **then** the same card, in the template the admin's role picks for it (`roles.json`), also shows
  an Approve button and the echo of what it sets; **given** the builder, **when** I add a button and set "Show
  when" to "app.user.roles has the role admin", **then** the button is hidden until the roles hold admin — the
  other way to give a role one more widget.

**Verified by:** `run-page.feature` (a finished run as a fact sheet with its pipeline and history; a run nobody knows
as a result with one way on; a failed run retried from a dialog with a reason, coming back queued; the dialog closing
from its icon), `more-widgets.feature` (every preview, the settings card's number and day, the runs range filtering on
the server, the long text), `roles.feature` (the roles page; Delete run confirming), the eight conformance sets
(`numberConformance`, `dateConformance`, `dateRangeConformance`, `descriptionsConformance`, `resultConformance`,
`dialogConformance`, `stepsConformance`, `timelineConformance`) and the input's `MultiLine` and the button's
`Confirms` / `CancelsConfirm` stories, the table-view loader's `filterBetween` test, the engine's standard-contracts
test.

### WW-35 · Xsight Wirework - Filters I can see in the table, and a list that becomes cards on my phone

**Type:** User feature · **Status:** In progress — the filter row is built (9 November 2026), the cards are to do
(designed 9 November 2026, doc/table-filters-cards-design.md)

**Short description:** As a dashboard user, I see what a list is filtered by without opening anything — a filter row
under the headers, a search field with a search icon for a text column and a list of values for the others, always
visible and in step with the header filters and the filter bar — and on a narrow screen every row of the list becomes
a card of labelled fields that still selects, links and loads more, so the runs list works on a phone. As a page
builder I turn both on with settings; nothing is wired anew.

**Acceptance criteria:**

- **Given** a table with the filter row on, **when** I look at it, **then** every filterable column shows its control
  under its title — a search field with a search icon for a text filter, a list of values for the others — and
  **when** I type in the search field and press Enter, **then** the rows are re-requested with that text, and the
  same text shows in the column's header filter.
- **Given** a filter row control, **when** I click inside it, **then** the column does not sort.
- **Given** a table on a screen narrower than its card threshold, **when** it renders, **then** every row is a card
  whose fields are the columns, in the same cell kinds (a status tag, a link, the Copy button); **when** I click a
  card, **then** the row is selected; **when** I click a link in a card, **then** the page follows it.
- **Given** the history list as cards, **when** I scroll to its end, **then** more rows load as cards.
- **Given** the builder, **when** I set "cards" to always, **then** the table shows cards at any width; never keeps it
  a table.

**Verified by:** the filter row — the story `FilterRow` of the infinite table (no demo page turns the row on: the
product owner, on seeing it, wants filters only behind the header icons), and the table view's own example of a first answer (`doc/tableApi/4-data-first-response.json`) in the
`table-view` unit tests; the cards — to be written (the phone scenarios).
