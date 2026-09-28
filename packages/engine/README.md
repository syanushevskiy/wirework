# @wirework/engine

The framework-free core of Wirework.

- **Registries** for widgets, contracts, actions and layout engines
  (`createRegistry`, `createContracts`, `createActions`,
  `createLayoutEngines`), each refusing a definition that breaks its rules.
- **Resolution**: `resolvePage` turns view models plus a user's overlay into
  the cells to render — every problem isolated to its cell, never a crash.
- **Validation**: `validateViewModels` reports every problem of a tree at
  boot; `problemText`, `errorText`, `issuesText` for messages.
- **Reactions**: `bindReactions` runs a page's declared reactions on the bus;
  page load events.
- **Trees and paths**: pure helpers to edit view models
  (`updatePageTemplate`, `updateWidgetTemplate`, the user-overlay updates)
  and to generate and check store paths (`suggestedInputPaths`,
  `boundPaths`, `compatibleStorePaths`).
