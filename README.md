# Wirework

A config-driven widget and page engine for React. A page is configuration
— view models that place registered widgets in a layout, bind their input
ports to paths in one store, and turn the events they emit into reactions
(write a path, or call a host action). Widgets read the store and emit
events; they never write it. A builder lets people assemble such pages
without writing code, and a host application decides where pages are kept.

## Packages

| Package                                                                         | What it is                                                                                         |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `@wirework/schema`                                                              | Contracts, model types and the path rules. Depends on zod only.                                    |
| `@wirework/store`                                                               | The Store contract on Zustand: path reads, path subscriptions, layered stores.                     |
| `@wirework/events`                                                              | The widget event bus.                                                                              |
| `@wirework/engine`                                                              | Registries, page resolution, validation, reactions, tree editing. Framework-free.                  |
| `@wirework/react`                                                               | The React adapter: `PageView`, `WidgetPreview`, widget and layout-engine definitions, store hooks. |
| `@wirework/widget-contracts`                                                    | The standard widget kinds (label, button, input, table, …) as contracts without components.        |
| `@wirework/antd-widgets`                                                        | The standard kinds implemented on Ant Design.                                                      |
| `@wirework/table-view`                                                          | Actions for a table the server describes (the view table API).                                     |
| `@wirework/engine-react-grid-layout`, `-gridstack`, `-flexlayout`, `-flex-rows` | Layout engine plugins.                                                                             |
| `@wirework/engine-grid`                                                         | The column grid the two grid engines share: placements, cells, the pure operations.                |
| `@wirework/builder`                                                             | The page builder as hooks, without a UI library.                                                   |
| `@wirework/antd-builder`                                                        | The page builder as Ant Design components.                                                         |

`apps/playground` is the demo host and the e2e harness; `e2e` the Gherkin
suite; `doc/` the engine's design decisions and coding guidelines.

## Developing

```
pnpm install
pnpm dev          # the playground, port 5173
pnpm check        # typecheck, lint, format check, build, publint, unit tests (with the stories), e2e — what CI runs
```

The stories of `@wirework/antd-widgets` and `@wirework/antd-builder` run in
Chromium as part of the unit tests, and the e2e suite drives the playground
in it: `pnpm --filter e2e exec playwright install chromium` once.

Inside the workspace every package resolves to its TypeScript source: no
build is needed to develop, test or run the playground.

## Publishing

The packages are proprietary (`UNLICENSED`) and published with restricted
access. `pnpm build` emits every package's `dist/` (JavaScript, declaration
files and source maps, `tsconfig.build.json`); each package's
`publishConfig` points consumers at `dist/` while the workspace keeps using
`src/`. Then, from the root:

```
pnpm build
pnpm -r publish
```

`@wirework/view-data-models-examples` (fixtures), the playground and the
e2e suite are private and never published.
