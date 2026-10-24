# Product stories — Xsight Wirework

One epic, twenty-three stories: fourteen done between 15 and 29 September 2026, one on 23 October 2026 (WW-21) and two
on 24 October 2026 (WW-22, WW-23), six to do (WW-15 to WW-20). Written for
managers and product owners: each story says who gets what and why. For the user-facing stories (WW-1 to WW-11,
WW-16 to WW-20, WW-21 to WW-23) the acceptance criteria are Given / When / Then scenarios in the same language as the project's
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
application. A demo application with five pages shows it working end to end on simulated servers.

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
- **Given** the runs page, **when** I look at its table, **then** Name and Status carry a filter icon in their headers
  (Name offering the page's three suites, as the filter bar's Suite does) and Reference none.
- **Given** the runs page on its second page, **when** I tick Failed in the Status header and press OK, **then** the
  filter bar's Status shows Failed too, the list is back on page 1 and counts the failed runs; **when** I unpick Failed
  in the bar, **then** all runs are back.
- **Given** the runs page, **when** I click the Name header, **then** the server is asked for the list by name,
  ascending.
- **Given** a paged table without the setting, **when** its columns say what they filter by, **then** its headers are
  plain: no icon, no sorting — every page built so far looks as it did.

**Verified by:** `infinite-table.feature` (the window scenario), `table-view.feature` ("A header filter on the paged
table"), the `antd-infinite-table` `Window` story, the `antd-table` `HeaderFilters` and `HeadersOff` stories, the
`rowWindow` unit tests (8).
