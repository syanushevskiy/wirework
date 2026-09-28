# @wirework/store

The Wirework `Store` contract on Zustand: dot-path reads and writes, path
subscriptions that fire when the value at a path changes identity, and a
guard that keeps configuration (`viewModels`, `userViewModels`) writable
only through `setConfig`. Depends on `@wirework/schema` and `zustand`.

- `createStore(initial)` — a store of its own.
- `fromZustand(api: StateApi)` — the contract over a Zustand store you
  built, with the middleware you want (`devtools`, `persist`, …). Every
  write names itself for the devtools (`set <path>`, `replace`).
- `layerStores({ page, shared, sharedRoots }: StoreLayers)` — two stores
  behind one tree, routed by a path's first segment: the roots named in
  `sharedRoots` outlive a page, every other root starts over with it.
