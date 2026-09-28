/**
 * THE write path for configuration. Everything that changes a page — placing
 * a widget, choosing its engine, saving an edit session — goes through
 * `commit`, and nothing else writes the trees. One function to read, one
 * place an audit trail can sit, and one guarantee: what the host is asked to
 * persist is exactly what the store now holds.
 *
 * `setConfig` (not `set`): the view models are configuration, which `set`
 * refuses — only editors like this one may write them.
 */
import { useCallback } from "react";
import type { Store, UserViewModels, ViewModels } from "@wirework/schema";

/** Both editable trees, as they live in the store. */
export interface EditableTrees {
  viewModels: ViewModels;
  userViewModels: UserViewModels;
}

/**
 * Where the HOST keeps its pages. Called after the store is written, with
 * everything as it now stands — a host writes it to a server, a file or the
 * browser. It may be async. A rejection is reported to the console and
 * otherwise ignored here: the page on screen is already changed, only the
 * host's copy failed, and what to tell the user is the host's decision — a
 * host that wants more wraps its own `save`.
 */
export type SaveTrees = (trees: EditableTrees) => void | Promise<void>;

/** At least one tree: a commit that writes nothing is a mistake, not a no-op the host should be asked to persist. */
export type TreesChange =
  | EditableTrees
  | Pick<EditableTrees, "viewModels">
  | Pick<EditableTrees, "userViewModels">;

export type Commit = (next: TreesChange) => void;

const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };

/**
 * The write itself, as a plain function: write what changed, then hand the
 * host what the store holds — read BACK, never the argument, so a dedup or
 * a concurrent write can never leave the host with a stale tree.
 */
export function commitTrees(store: Store, save: SaveTrees, next: TreesChange): void {
  // The store dedups unchanged trees, so writing both is always safe.
  if ("viewModels" in next) store.setConfig("viewModels", next.viewModels);
  if ("userViewModels" in next) store.setConfig("userViewModels", next.userViewModels);
  const saved: EditableTrees = {
    viewModels: store.get<ViewModels>("viewModels") ?? NO_VIEW_MODELS,
    userViewModels: store.get<UserViewModels>("userViewModels") ?? {},
  };
  Promise.resolve()
    .then(() => save(saved))
    .catch((error: unknown) => console.error("Saving the page failed:", error));
}

/** `commitTrees` bound to this store and this host's `save`. Required: a builder never guesses where pages go. */
export function useCommit(store: Store, save: SaveTrees): Commit {
  return useCallback((next) => commitTrees(store, save, next), [store, save]);
}
