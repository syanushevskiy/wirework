# ADR-0018: Lazy widgets — a widget's code is loaded by the pages that show it

- **Status:** Accepted — phase 1 built
- **Deciders:** the product owner

## 1. Decision

A widget's CONTRACT stays registered at boot; only its COMPONENT may be
loaded on demand. An implementation says `load: () => import("./file")`
instead of `component`, and the adapter (`@wirework/react`) does the rest:
the page asks for the code of the widgets it shows, a cell shows a quiet
placeholder until its widget arrives, and code that does not arrive is that
one cell's problem, with "Load again". Phase 1 is built; phases 2 and 3 are not.

## 2. Problem

A host adds a heavy widget — a Monaco editor — to ONE page. Without a
split its code is downloaded by every visitor of every page. It should be
loaded only when a page that shows it opens. Two things the user must
feel: the pages without the editor open as fast as before it existed, and
the page with it never looks broken while it loads.

What the decision rests on:

- A widget is two things of very different weight: its contract (ports,
  events, the settings schema — a few hundred bytes of data) and its
  component (React and whatever library it draws with). The definition
  already separates them: the schema calls the component "an OPAQUE slot",
  and the resolver, boot validation and the builder read the contract only.
  `CellView` is the one place a component is rendered.
- The registries are sealed at boot and resolution is synchronous: every
  page is validated against every registered widget before anything
  renders. A design that makes a DEFINITION arrive later breaks both.
- Widgets do not receive events; they read the store and emit. A widget
  that mounts a moment late misses nothing.
- A layout engine's `renderer` is the same kind of opaque slot, and a page
  uses one engine.

## 3. Details

### `load` instead of `component`

```ts
export const monacoEditor = implementContract(codeEditorContract, {
  type: "acme-code-editor",
  load: () => import("./code-editor"), // the module's default export is the component
});
```

- `implementContract` takes `load` (and `placeholder: { minHeight }`) in
  place of `component`. For a renderer or a hand-made definition the
  adapter exports `lazyComponent(load, { name, minHeight })` (`lazy.tsx`):
  a component like any other, its loading state behind a symbol
  (`loadingOf`).
- The `import()` is written in the host's code (or the widget package's),
  so the host's bundler cuts the chunk. The page author changes nothing:
  the cell says `"widget": "acme-code-editor"` as before.
- The wrapper starts the import at most once, however many cells and pages
  ask; it can be started ahead of rendering; after a failure it asks again
  when told to.
- Lazy belongs to the adapter alone. The schema, the engine and the
  registries do not change: one option on one function, no second
  registry, no naming convention, no plugin that rewrites imports.
- The default stays `component`. Lazy is opted into per widget, by the
  person who knows it is heavy; a widget with `component` has no
  placeholder and no cost.

### When the code is asked for

- `PageView` asks for the renderer's and the cells' code when the plan is
  known (`usePreload`) — all at once, in parallel, before the first render.
  A page that does not show the widget never asks for it.
- A cell with a condition is not preloaded, whether or not the condition
  holds: its widget asks for its code when it mounts. The same goes for a
  dialog's content, a tab or a panel not yet opened.
- `preloadPage(input)` is exported for a host's router: start a page's
  chunks on the menu item's hover.
- A layout engine's renderer may be a `lazyComponent` and is preloaded with
  the page. The engine's pure half (`template`, `cells`, `applyChange`,
  `validate`) stays eager, as a widget's contract does.

### What the cell shows meanwhile

- The cell's element is there from the first render with
  `data-loading="true"` and a neutral block inside (`cell-loading`,
  `aria-busy`).
- The block appears only after 200 ms (a CSS animation delay), so a cached
  chunk never flashes one. No spinner per cell.
- In an engine whose cells size to their content (flex rows, CSS grid with
  `auto` rows) the block has a least height, 4.5rem by default;
  `placeholder: { minHeight }` says the widget's own. In the grid engines
  the cell's size is the layout's and nothing moves.

### When the code does not arrive

A rejected import — the network, or a deploy that replaced the chunk while
the tab was open — is that cell's problem alone: the cell's `widget-error`
with `data-problem="load-failed"`, the message and a "Load again" button
(`widget-load-again`) that asks once more. The rest of the page works. The
host hears it through `onError`, as it hears a crash; a host that wants to
reload the application on a stale chunk does it there.

### What a lazy widget's author must know

- The component's stylesheet is imported in the component's module, so it
  travels with the chunk.
- Anything else the library needs (Monaco's web workers) is set up inside
  that module.
- The CONTRACT module must not import the heavy library, even for a type:
  `import type` only. One value import and the split is gone, silently —
  the bundle check is what catches it.

### The demo and how it is tested

- The `code-editor` contract and its lazy implementation
  `demo-code-editor` on the editor page (`/demo/editor`). The editor is a
  textarea with line numbers standing in for a heavy library. Its loader
  goes through the demo's request tracking (`loadedCode`,
  `api/requests.ts`), so the slow-server steps hold its code back, and
  `wirework.loaded()` lists the code that arrived. That list is the demo's,
  not the adapter's.
- `pnpm check:bundle` (part of `pnpm check`, `scripts/check-bundle.mjs`)
  builds the playground and fails when the editor's mark is in the entry
  chunk or the entry is over 2,400 kB. It is the regression test: a split
  can be lost by one import and no scenario would notice.
- Proven by `lazy.test.tsx` and `lazy-widgets.feature`.

### Not built

- **Phase 2 — what everybody downloads today.**
  - The shipped layout engines lazy (the three library-backed ones).
  - An entry per heavy standard widget (`@wirework/antd-widgets/table`,
    `/infinite-table`, `/date`, `/date-range`) and
    `createAntdWidgets({ lazy: true })` registering those with `load`. The
    rule is a number: a widget whose own dependencies are over about 30 kB
    gzipped is lazy, anything smaller is not — a request per label costs
    more than the label.
  - The builder's palette mounting a lazy widget's live preview only while
    its card is in view (an intersection observer); out of view, the name
    and description alone. Today the palette mounts every preview, so
    opening the catalog loads the editor's code.
- **Phase 3 — on request.** `preload: "page"` on an implementation (load
  with the page even while hidden — a dialog that must open instantly); a
  host recipe for stale chunks after a deploy.

Each part of phase 2 is worth doing only if a measurement says so.

### For the owner to decide

1. Lazy is opted into per widget by its author (as it is now), or every
   widget of a package is lazy by default.
2. Whether phase 2 goes before a host's Monaco arrives (the engines and
   heavy standard widgets are in every visitor's download today), or after.
3. The placeholder: a quiet block after 200 ms (as it is now), or antd's
   skeleton — which would put a UI library's look into `@wirework/react`, a
   package that has none.

## 4. Options weighed

| Option                                                        | Verdict                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Leave it to the host: a `Suspense` per cell, `React.lazy`  | The least code, and still possible. But chunks load as a waterfall (each when its cell first renders, a container's content after the container), React's `lazy` keeps a failed import failed for good, and the palette loads everything. |
| B. `load` on the implementation; the adapter owns the rest    | CHOSEN. Parallel loading from the plan the resolver already produces, a placeholder, a retry and a fact for tests; registries and validation untouched.                                                                                   |
| C. Register a widget when its page opens                      | Refused. Boot validation of the other pages reports "unknown widget", the seal goes, the palette is incomplete until every page was visited.                                                                                              |
| D. Lazy definitions — the contract too                        | Refused. Resolution, validation, the builder and every test of them become asynchronous, for a few hundred bytes of schema per widget.                                                                                                    |
| E. Split by page at build time (a bundler plugin reads pages) | Refused. Wrong the day a page changes at run time: a page saved in the builder, a role's view, an imported page file. Pages are data; the bundler cannot see them.                                                                        |

C and D trade the engine's two strongest properties — everything validated
at boot, resolution pure and synchronous — for bytes that are not the
heavy ones.

**Measurements.** Before the mechanism the playground was one JavaScript
file of 2,169 kB (666 kB gzipped; 3,600 modules): antd, the thirty-two
widgets, five layout engines with gridstack, FlexLayout and
react-grid-layout, the builder. With phase 1 the entry is 2,175 kB and the
editor is 1 kB of JavaScript and 1 kB of CSS in chunks of their own.
`@wirework/antd-widgets` exports `.` only, so a dynamic import of it is
one chunk with everything — hence the entries per heavy widget in phase 2.

**Risks.**

- A stale chunk after a deploy is the failure hosts will actually meet.
  The retry and `onError` must be tried against a real redeploy, not only a
  mocked rejection.
- The editor is not the whole problem: the engines and antd's table and
  date pickers are in every visitor's download. The mechanism pays for
  itself before any host adds Monaco — the case for phase 2 going first.
- HTTP caching saves the download, not the parse and compile time of every
  visit, and a host that releases weekly empties the cache weekly.
- Every lazy widget is a request and a possible flash: split all
  thirty-two and a page makes that many requests.
