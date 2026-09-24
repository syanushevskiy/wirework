/**
 * THE write path for configuration. Everything that changes a page — placing
 * a widget, saving an edit session — goes through `commit`, and nothing else
 * writes the trees. One function to read, one place a permission or an audit
 * trail can sit, and one guarantee: what the host is asked to persist is
 * exactly what the store now holds.
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
 * browser. It may be async; a rejection is reported, never swallowed.
 */
export type SaveTrees = (trees: EditableTrees) => void | Promise<void>;

/** Write what changed; leave out what did not. */
export type Commit = (next: Partial<EditableTrees>) => void;

const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };

export function useCommit(store: Store, save?: SaveTrees): Commit {
  return useCallback(
    (next) => {
      // The store dedups unchanged trees, so writing both is always safe.
      if (next.viewModels !== undefined) store.setConfig("viewModels", next.viewModels);
      if (next.userViewModels !== undefined) store.setConfig("userViewModels", next.userViewModels);
      if (!save) return;
      // Read BACK: the host persists what the store holds, never a tree that
      // a dedup or a concurrent write made stale.
      const saved = {
        viewModels: store.get<ViewModels>("viewModels") ?? NO_VIEW_MODELS,
        userViewModels: store.get<UserViewModels>("userViewModels") ?? {},
      };
      void (async () => {
        try {
          await save(saved);
        } catch (error) {
          // The page itself is already changed; only the host's copy failed.
          console.error("Saving the page failed:", error);
        }
      })();
    },
    [store, save],
  );
}
