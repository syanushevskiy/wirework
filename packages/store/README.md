# @wirework/store

The Wirework `Store` contract on Zustand: dot-path reads and writes, path
subscriptions that fire when the value at a path changes identity, and a
guard that keeps configuration (`viewModels`, `userViewModels`) writable
only through `setConfig`.

- `createStore(initial)` — a store of its own.
- `fromZustand(api)` — the contract over a Zustand store you built, with the
  middleware you want (`devtools`, `persist`, …). Every write names itself
  for the devtools.
- `layerStores({ page, shared, sharedRoots })` — two stores behind one
  tree, routed by a path's first segment.
