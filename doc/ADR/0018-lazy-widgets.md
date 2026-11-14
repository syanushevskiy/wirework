# ADR-0018: Lazy widgets — a widget's code is loaded by the pages that show it

- **Status:** Accepted — phase 1 built
- **Date:** 2026-11-14
- **Deciders:** the tiger team (doc/team_tiger.md) and the product owner

Designed 14 November 2026 with the tiger team; phase 1 built the same day
on the team's own choices ("Built" at the end). Phases 2 and 3 are not
built, and the three points under "For the owner to decide" stay open.

## The ask

A host adds a heavy widget — a Monaco editor — to ONE page. Today its code
would be downloaded by every visitor of every page. It should be loaded
only when a page that shows it opens.

## The answer in short

- A widget is two things with very different weights: its CONTRACT (ports,
  events, the settings schema — data, a few hundred bytes) and its
  COMPONENT (React, and whatever library it draws with). Only the
  component becomes lazy. The contract stays where it is, registered at
  boot, so validation, the resolver, the builder's forms and the palette
  work exactly as today.
- An implementation says `load` instead of `component`:

  ```ts
  export const monacoEditor = implementContract(codeEditorContract, {
    type: "acme-code-editor",
    load: () => import("./code-editor"), // the module's default export is the component
  });
  ```

  The `import()` is written in the host's code (or the widget package's),
  so the host's bundler cuts the chunk. Nothing else changes for the page
  author: the cell says `"widget": "acme-code-editor"` as before.

- The page starts loading the code of every widget it SHOWS the moment its
  plan is resolved — all at once, before the first render — and each cell
  shows a placeholder of its own until its widget arrives. A page without
  the editor never asks for it.
- A widget hidden by its condition, in a closed dialog or in a tab not yet
  opened is loaded when it is first shown.
- A chunk that fails to load is that cell's problem alone, with "Load
  again"; the rest of the page works.

## What there is (read from the code, 14 November 2026)

- **One chunk.** The playground builds to a single JavaScript file of
  2,169 kB (666 kB gzipped; 3,600 modules): antd, the thirty-two widgets,
  five layout engines with gridstack, FlexLayout and react-grid-layout,
  the builder. Nothing in the packages or the demo uses `import()`,
  `React.lazy` or `Suspense`.
- **The definition already separates the two.** `implementContract(contract,
{ type, component })` copies `io`, `events` and `viewModel` from the
  contract and adds the component; the schema calls the component "an
  OPAQUE slot — the engine never touches it" (`contracts/widget.ts`). The
  resolver, boot validation and the builder read the contract's side only.
  `CellView` is the one place a component is rendered.
- **A host can almost do it today:** `component: lazy(() => import(…))`
  type-checks. But no cell has a `Suspense` boundary, so the first render
  of that widget suspends the whole page — and React's `lazy` keeps a
  failed import failed for good.
- **The registries are sealed at boot and resolution is synchronous**
  (`boot.ts`, `resolvePage`). Every page is validated against every
  registered widget before anything renders. Any design that makes a
  DEFINITION arrive later breaks both.
- **The palette renders every widget live.** With the catalog open,
  `WidgetPalette` mounts a `WidgetPreview` per widget — it would fetch
  every lazy chunk at once.
- **Layout engines have the same slot.** `LayoutEngine.renderer` is as
  opaque as a widget's component, a page uses ONE engine, and the three
  third-party layout libraries are in everybody's bundle.
- **A package's widgets come through one door.** `@wirework/antd-widgets`
  exports `.` only; `createAntdWidgets()` imports all thirty-two
  components. A dynamic import of that entry is one chunk with everything.
- **Widgets do not receive events.** They read the store and emit. A
  widget that mounts a moment late misses nothing: what a page's `load`
  reaction wrote is in the store when it arrives.

## The question, and five answers

- **A. Leave it to the host.** Add a `Suspense` boundary per cell and tell
  hosts to pass `React.lazy`. The least code. But the chunks load as a
  waterfall — each when its cell first renders, a container's content
  after the container —, a failed chunk cannot be retried, and the palette
  loads everything.
- **B. `load` on the implementation; the adapter owns the rest.** The
  library wraps the loader, starts every chunk a page needs when the plan
  is known, gives each cell a placeholder, a retry and a fact for tests.
- **C. Register a widget when its page opens.** The registry grows per
  route. Boot validation of the other pages reports "unknown widget", the
  seal goes, the builder's palette is incomplete until every page was
  visited.
- **D. Lazy definitions — the contract too.** Resolution becomes
  asynchronous: `resolvePage`, validation, the builder and every test of
  them. For a few hundred bytes of schema per widget.
- **E. Split by page at build time.** A bundler plugin reads the page
  folders and generates an import list per route. Fast and invisible — and
  wrong the day a page changes at run time: a page saved in the builder, a
  role's view, a page file imported. Pages are data; the bundler cannot
  see them.

**Decision: B.** It gets E's parallel loading at run time from the plan the
resolver already produces, keeps the registries and validation untouched,
and A remains possible for a host that wants nothing more. C and D are
refused: they trade the engine's two strongest properties — everything
validated at boot, resolution pure and synchronous — for bytes that are
not the heavy ones.

## The design

### 1. `load` instead of `component`

`implementContract` and `defineWidget` take either. `load` returns a
promise of a module whose default export is the component — what
`import("./file")` gives. The adapter (`@wirework/react`) turns it into a
component that:

- starts the import at most once, however many cells and pages ask;
- can be asked to start it ahead of rendering (`preload`);
- after a failure, asks AGAIN when told to — it does not remember a
  rejected import forever.

The definition's `component` slot holds that wrapper, so the schema
package, the engine and the registries do not change. A widget that says
`component` behaves exactly as today, with no placeholder and no cost.

### 2. The page loads what it shows, at once

When a layout's plan is resolved (`usePagePlan`, and `useNestedLayout` for
a container's content), the adapter starts the import of every lazy widget
among its cells — except those whose condition does not hold now. The
chunks travel in parallel while React renders; a cell whose code has
arrived renders with no placeholder at all.

A cell hidden by `when`, a dialog's content, a tab or a panel never opened
is not mounted and not preloaded: its code is asked for when it is first
shown. A host that knows better says so on the implementation
(`preload: "page"`: load with the page even while hidden — a dialog that
must open instantly).

`preloadPage(page)` is exported for a host's router: start a page's chunks
on the menu item's hover, before the click.

### 3. What a cell shows meanwhile

The cell's own element is there from the first render, with
`data-loading="true"` and a neutral block inside (`cell-loading`,
`aria-busy`). Two rules keep the page still:

- the placeholder appears only after 200 ms, so a cached chunk never
  flashes one;
- in an engine whose cells size to their content (flex rows, CSS grid with
  `auto` rows) the block has a least height, 4.5rem by default, and an
  implementation that knows its size says it (`placeholder: { minHeight }`)
  — the editor does not push the page down when it arrives. In the grid
  engines the cell's size is the layout's and nothing moves.

### 4. When the code does not arrive

A rejected import — the network, or a deploy that replaced the chunk's
file while the tab was open — is the cell's problem: the existing crash
box with `data-problem="load-failed"`, the message, and a "Load again"
button that asks once more. The host hears it through `onError`, as it
hears a crash; a host that wants to reload the application on a stale
chunk does it there.

### 5. The builder

- **The palette** mounts a lazy widget's live preview only while its card
  is IN VIEW (an intersection observer on the card); out of view it shows
  the widget's name and description alone. Searching for "editor" and
  seeing its card loads its code — in the builder, to an editor of pages,
  which is the right person to pay for it.
- **Editing** a page needs nothing new: the form is the contract's.

### 6. Layout engines, the same way

`renderer` may be `load` as well. A page on CSS grid then never downloads
gridstack or FlexLayout. The engine's pure half — `template`, `cells`,
`applyChange`, `validate` — stays eager, as a widget's contract does; the
page shows its own placeholder until the renderer arrives.

### 7. The standard widgets

For `load` to help with the widgets Wirework ships, a dynamic import must
be able to reach ONE of them. `@wirework/antd-widgets` gains an entry per
heavy widget (`@wirework/antd-widgets/table`, `/infinite-table`,
`/date`, `/date-range`) and `createAntdWidgets({ lazy: true })` registers
those with `load`. The small ones — a label, a tag, a button — stay in the
main chunk: a request per label costs more than the label.

### 8. What a lazy widget's author must know

- The component's stylesheet is imported in the component's module, so it
  travels with the chunk — not in the host's entry.
- Anything else the library needs (Monaco's web workers) is the widget's
  to set up inside its module.
- The CONTRACT module must not import the heavy library, even for a type:
  `import type` only. One value import and the split is gone — silently.
  The bundle check below is what catches it.

## How it is tested

- **Unit (`@wirework/react`):** the wrapper loads once for many cells,
  retries after a failure, preloads on request; `CellView` shows the
  placeholder, then the widget, then — for a rejected import — the problem
  with its button; a page's plan starts every visible lazy widget's import
  and no hidden one's.
- **A demo widget** in the playground, `demo-code-editor` on a page of its
  own, lazy. Its loader goes through the demo's request tracking, so the
  existing `Given the server is slow to answer` holds its code back and
  `the server has had time to answer` lets it through — no sleeps.
- **Scenarios in plain words** (`lazy-widgets.feature`):

  ```gherkin
  Scenario: A page that does not show the editor never loads its code
    Given I open the "overview" page
    Then the code of the widget "demo-code-editor" was not loaded

  Scenario: The editor's page shows a placeholder until its code arrives
    Given the server is slow to answer
    And I open the "editor" page
    Then the cell "editor-main" is loading
    When the server has had time to answer
    Then the cell "editor-main" shows its widget
    And the code of the widget "demo-code-editor" was loaded once

  Scenario: Code that fails to load is one cell's problem, and can be asked for again
  ```

  `the code of the widget … was loaded` reads `wirework.loaded()` in the
  console, beside `wirework.requests()`.

- **A bundle check in `pnpm check`:** the playground's build must not
  contain the demo editor's marker string in its entry chunk, and the
  entry chunk has a size budget. This is the test that fails when somebody
  imports the heavy module from a contract file.

## The tiger team's positions

- **Morgan (product):** two things the user must feel: the pages that do
  not use the editor open as fast as before it existed, and the page that
  does never looks broken while it loads. Asked for the placeholder to be
  calm — no spinner per cell on a page of twelve widgets — hence the
  200 ms rule.
- **Alexei (architecture):** the line is already in the code: the contract
  is data, the component is opaque. Lazy loading belongs to the adapter
  alone; the schema, the engine and the registries must not learn the
  word. One option on one function — not a second registry, not a
  `registerLazy`.
- **Dmitri (readability):** `load: () => import("./code-editor")` is one
  line a junior has seen in every React project. No magic naming
  convention, no plugin that rewrites imports. And the default stays
  `component`: lazy is opted into per widget, by the person who knows it
  is heavy.
- **Katya (team lead):** the rule for the team is a number, not a feeling:
  a widget whose own dependencies are over about 30 kB gzipped is lazy,
  anything smaller is not. The author's three duties (section 8) go into
  the widget README. Engines by the same option, so there is one thing to
  learn.
- **Sasha (QA):** loading is a STATE and needs a fact: `data-loading`, the
  placeholder's test id, `load-failed` as a problem kind, and the loaded
  list in the console. The slow-server step must cover code as it covers
  data, or every scenario with a lazy widget races. The bundle check is
  the regression test — a split can be lost by one import and no scenario
  would notice.
- **Ren (contrarian):** three challenges. (1) "Is the editor the problem?
  The bundle is 2.2 MB without it." — Right, and it reorders the phases:
  the engines and antd's table and date pickers are in every visitor's
  download today; the mechanism pays for itself before any host adds
  Monaco. (2) "Every lazy widget is a request and a possible flash; split
  thirty-two widgets and the overview makes thirty-two requests." — hence
  only the heavy ones, and the budget rule. (3) "HTTP caching makes this
  matter once per release." — true for the download, not for parse and
  compile time on every visit, and a host that releases weekly empties
  the cache weekly. Ren's risk to watch: a stale chunk after a deploy is
  the failure hosts will actually meet; the retry and `onError` must be
  tried against a real redeploy, not only a mocked rejection.
- **Vlad (fluency):** preloading is one expression over the plan — the
  cells, those that show, their definitions, each asked to load. No
  bookkeeping of what was requested: the wrapper remembers its own
  promise.
- **The external reviewer:** the smallest thing that keeps the promise is
  the wrapper, the boundary in `CellView` and the preload from the plan —
  about one file and two edits. Build that first and measure. The entries
  per standard widget, lazy engines and the palette's observer are each
  worth doing only if the measurement says so; `preload: "page"` waits for
  the first host that asks.

## Phases

1. **The mechanism.** `load` on a widget's implementation, the placeholder
   and the retry in `CellView`, the preload from the plan, `preloadPage`,
   the demo editor page, the scenarios and the bundle check.
2. **What everybody downloads today.** `load` for a layout engine's
   renderer, with the three library-backed engines lazy in the demo; the
   entries for the heavy standard widgets and `createAntdWidgets({ lazy })`;
   the palette's previews in view only. Measured against the 2,169 kB of
   today.
3. **On request.** `preload: "page"` for hidden widgets; a host recipe for
   stale chunks after a deploy.

## For the owner to decide

1. Lazy is opted into per widget by its author (the team's choice), or
   every widget of a package is lazy by default.
2. Whether phase 2 — the engines and the heavy standard widgets — goes
   before a host's Monaco arrives, as Ren argues, or after.
3. The placeholder: a quiet block after 200 ms (the team's choice), or
   antd's skeleton — which would put a UI library's look into
   `@wirework/react`, a package that has none.

## Built (14 November 2026): phase 1

- **`@wirework/react`:** `lazyComponent(load, { name, minHeight })`
  (`lazy.tsx`) — a component like any other, with the placeholder
  (`cell-loading`), the problem with "Load again" (`widget-error`,
  `data-problem="load-failed"`, `widget-load-again`) and its loading state
  behind a symbol (`loadingOf`). `implementContract` takes `load` (and
  `placeholder: { minHeight }`) in place of `component`. `CellView` says
  `data-loading="true"` on the cell and reports a failed load through
  `onError`. `PageView` asks for the renderer's and the cells' code when the
  plan is known (`usePreload`); `preloadPage(input)` is exported for a
  router.
- **A layout engine's renderer** may already be a `lazyComponent` — the
  slot is a component — and is preloaded with the page (unit-tested). No
  shipped engine is lazy yet: that is phase 2.
- **The demo:** the `code-editor` contract and its lazy implementation
  `demo-code-editor` on a page of its own, `/demo/editor` (three cells:
  the title, `editor-main`, `label-editor-source` echoing `editor.source`).
  The editor is a plain textarea with line numbers standing in for a heavy
  library — Monaco itself was not added. Its loader goes through
  `loadedCode` (`api/requests.ts`), so the slow-server steps hold its code
  back, and `wirework.loaded()` lists what arrived.
- **The bundle check:** `pnpm check:bundle` (in `pnpm check`) builds the
  playground and fails when the editor's mark is in the entry chunk or the
  entry is over 2,400 kB. Today: entry 2,175 kB, the editor 1 kB of
  JavaScript and 1 kB of CSS in chunks of their own.
- **Departures from the design.** The 200 ms rule is a CSS animation
  delay, not a timer. A cell with a condition is not preloaded whether or
  not the condition holds now — its widget asks for its code when it
  mounts, which for a shown widget is the same moment. The loaded list is
  the demo's (the loader records it), not the adapter's.
- **Not built:** the palette still mounts every preview — opening the
  catalog in the builder loads the editor's code; no standard widget and
  no engine is lazy, so the entry chunk is as large as before;
  `preload: "page"`.
- **Tested:** `lazy.test.tsx` (seven tests), `lazy-widgets.feature` (five
  scenarios), `scripts/check-bundle.mjs`.
