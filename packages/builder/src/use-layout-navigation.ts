/**
 * Moving between a page and the layouts INSIDE its containers
 * (doc/ADR/0009-containers.md) — the rules every host of the builder needs,
 * in one place: a container's "Edit content" opens the layout it holds and
 * starts editing it; a breadcrumb leads back; a container that was just
 * added opens at once, so the next widget goes inside it; and widgets are
 * added to a layout inside a container on the SHARED page only.
 *
 * The host keeps one piece of state — `at`, the chain of containers down to
 * the layout shown (`card-1`, `card-1/card-2`, `tabs-1/tabs.0.content`),
 * undefined for the page itself — and gives it to `usePageEditing`,
 * `usePageToolbar` and, as `addAt`, to `useBuilder`. This hook is given the
 * same state and says how it moves:
 *
 *   const [at, setAt] = useState<string | undefined>(undefined);
 *   const editing = usePageEditing({ …, at });
 *   const layout = useLayoutNavigation({ at, onAt: setAt, save: savePage,
 *     startEditing: editing.startEditing, target, addsToPage: page === "builder" });
 *   const builder = useBuilder({ …, at: layout.addAt, onAdded: layout.onAdded });
 *   <PageView onEditLayout={layout.editLayout} … />
 *   usePageToolbar({ …, at, onGoTo: layout.goTo })
 */
import { useCallback } from "react";
import { layoutChain } from "@wirework/engine";
import type { EditTarget } from "./page-edits";
import type { PlacedWidget } from "./use-builder";

export interface LayoutNavigationInput {
  /** The layout shown: the page's own when undefined, else the one inside the containers chained here. */
  at: string | undefined;
  /** Show another layout — the host's state setter. */
  onAt: (at: string | undefined) => void;
  /**
   * The host's "Save page": commit the open edit session, and whatever the
   * host does after a commit (loading the page again). Called before the
   * layout shown changes — an edit session is one layout's, and left open
   * it would lock Add on every layout until someone found Save or Cancel.
   */
  save: () => void;
  /** Open an edit session on the layout shown (`usePageEditing().startEditing`). */
  startEditing: () => void;
  /** Where edits go: widgets are added inside a container on the shared page (`"base"`) only. */
  target: EditTarget;
  /**
   * Whether the PAGE's own layout takes new widgets — a builder page. On any
   * other page widgets are added only inside a container (a page's own
   * layout is its configuration).
   */
  addsToPage: boolean;
  /** A widget was added: what the host does next (loading the page again). Before a container opens. */
  onChanged?: (() => void) | undefined;
}

export interface LayoutNavigation {
  /** Show the page (undefined) or the layout at a chain — a breadcrumb's step. Saves the open session first. */
  goTo: (at: string | undefined) => void;
  /** "Edit content" on a container: its layout opens IN EDIT MODE, a session of its own. */
  editLayout: (cellId: string, layoutPath: string) => void;
  /** For `useBuilder`'s `onAdded`: the page changed, and a container opens at once on its first layout. */
  onAdded: (placed: PlacedWidget) => void;
  /** Whether widgets can be added to the layout shown: offer the palette. */
  adding: boolean;
  /** Where a new widget goes — `useBuilder`'s `at`: the layout shown on the shared page, the page itself otherwise. */
  addAt: string | undefined;
}

export function useLayoutNavigation({
  at,
  onAt,
  save,
  startEditing,
  target,
  addsToPage,
  onChanged,
}: LayoutNavigationInput): LayoutNavigation {
  const goTo = useCallback(
    (next: string | undefined) => {
      save();
      onAt(next);
    },
    [save, onAt],
  );
  /** The chain to a layout inside a container of the layout shown now: one level further down. */
  const layoutIn = useCallback(
    (cellId: string, layoutPath: string) => [at, layoutChain(cellId, layoutPath)].filter(Boolean).join("/"),
    [at],
  );
  const editLayout = useCallback(
    (cellId: string, layoutPath: string) => {
      goTo(layoutIn(cellId, layoutPath));
      startEditing();
    },
    [goTo, layoutIn, startEditing],
  );
  const onAdded = useCallback(
    (placed: PlacedWidget) => {
      onChanged?.();
      // A container: its first layout is shown as the page, in view mode, so what is meant for inside it is added next.
      const inside = placed.layouts[0];
      if (inside !== undefined) goTo(layoutIn(placed.id, inside));
    },
    [onChanged, goTo, layoutIn],
  );
  const shared = target === "base";
  return {
    goTo,
    editLayout,
    onAdded,
    adding: addsToPage || (at !== undefined && shared),
    addAt: shared ? at : undefined,
  };
}
