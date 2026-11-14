/**
 * THE write path for configuration. Everything that changes a page — placing
 * a widget, choosing its engine, saving an edit session — goes through
 * `commit`, and nothing else writes the trees. One function to read, one
 * place an audit trail can sit, and two guarantees: what the host is asked
 * to persist is exactly what the store now holds, and the host persists
 * commits IN ORDER — one save at a time per store, however slow it is, so an
 * older tree can never land after a newer one.
 *
 * `setConfig` (not `set`): the view models are configuration, which `set`
 * refuses — only editors like this one may write them.
 */
import { useCallback } from "react";
import type { Store, UserViewModels, ViewModels } from "@wirework/schema";
import { stampProblem, stamped, type Migrations } from "@wirework/engine";

/** Both editable trees, as they live in the store. */
export interface EditableTrees {
  viewModels: ViewModels;
  userViewModels: UserViewModels;
}

/**
 * Where the HOST keeps its pages. Called after the store is written, with
 * everything as it now stands — a host writes it to a server, a file or the
 * browser. It may be async: the next commit's save waits for it.
 */
export type SaveTrees = (trees: EditableTrees) => void | Promise<void>;

/**
 * What a host does when its `save` failed. The page on screen is already
 * changed; only the host's copy is not. Unless the host says otherwise, the
 * failure is reported to the console.
 */
export type SaveError = (error: unknown, trees: EditableTrees) => void;

/** At least one tree: a commit that writes nothing is a mistake, not a no-op the host should be asked to persist. */
export type TreesChange = EditableTrees | Pick<EditableTrees, "viewModels"> | Pick<EditableTrees, "userViewModels">;

export type Commit = (next: TreesChange) => void;

const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };

// eslint-disable-next-line no-console -- the documented default until the host passes its own SaveError
const reportToConsole: SaveError = (error) => console.error("Saving the page failed:", error);

/** The save in flight per store, so the next one queues behind it. */
const queues = new WeakMap<Store, Promise<void>>();

/**
 * The write itself, as a plain function: write what changed, then hand the
 * host what the store holds — read BACK, never the argument, so a dedup or
 * a concurrent write can never leave the host with a stale tree.
 */
export function commitTrees(
  store: Store,
  save: SaveTrees,
  next: TreesChange,
  onError: SaveError = reportToConsole,
  migrations?: Migrations,
): void {
  // A tree this version cannot read — saved by a newer one — is never written over
  // (doc/ADR/0017-versioning-and-upgrades.md): the commit is refused whole, and the host is told.
  const unread = (["viewModels", "userViewModels"] as const)
    .filter((tree) => tree in next)
    .map((tree) => stampProblem(store.get<{ versions?: unknown }>(tree)?.versions, migrations))
    .find((problem) => problem !== undefined);
  if (unread !== undefined) {
    const held: EditableTrees = {
      viewModels: store.get<ViewModels>("viewModels") ?? NO_VIEW_MODELS,
      userViewModels: store.get<UserViewModels>("userViewModels") ?? {},
    };
    onError(new Error(`Nothing was changed: what is stored was ${unread}`), held);
    return;
  }
  // What is written says which data format it is in. The store dedups unchanged trees, so writing both is always safe.
  if ("viewModels" in next) store.setConfig("viewModels", stamped(next.viewModels, migrations));
  if ("userViewModels" in next) store.setConfig("userViewModels", stamped(next.userViewModels, migrations));
  const saved: EditableTrees = {
    viewModels: store.get<ViewModels>("viewModels") ?? NO_VIEW_MODELS,
    userViewModels: store.get<UserViewModels>("userViewModels") ?? {},
  };
  // Queue behind the save in flight: a failed one has been reported and
  // does not block the next.
  const previous = queues.get(store) ?? Promise.resolve();
  const current = previous.then(() => save(saved)).catch((error: unknown) => onError(error, saved));
  queues.set(store, current);
}

export interface CommitInput {
  store: Store;
  /** Where the host keeps its pages. Required: a builder never guesses where pages go. */
  save: SaveTrees;
  onError?: SaveError | undefined;
  /**
   * The data formats this version writes (doc/ADR/0017-versioning-and-upgrades.md):
   * every tree committed is stamped with them, and a tree in the store that
   * this version cannot read is never written over. Absent: format 1, no stamp.
   */
  migrations?: Migrations | undefined;
}

/** `commitTrees` bound to this store and this host's `save`. */
export function useCommit({ store, save, onError, migrations }: CommitInput): Commit {
  return useCallback((next) => commitTrees(store, save, next, onError, migrations), [store, save, onError, migrations]);
}
