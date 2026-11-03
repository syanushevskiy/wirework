/**
 * What a page gives the layouts INSIDE its widgets (doc/containers-design.md):
 * everything `PageView` was given, so a container widget can render its
 * layout with the page's own machinery without receiving any of it as
 * props. `PageView` provides it for the page; `NestedLayout` provides it
 * again, one level deeper, for the layouts inside. Absent outside a page
 * (a palette preview, a story without a page), and a container then shows
 * only that it holds a layout.
 */
import { createContext, useContext } from "react";
import type { EventBus, Store, UserViewModels, ViewModels } from "@wirework/schema";
import type {
  ActionRegistry,
  AppearanceRegistry,
  LayoutEngineRegistry,
  PredicateRegistry,
  WidgetRegistry,
} from "@wirework/engine";
import type { PageError } from "./PageView";

export interface PageScope {
  /** The page's name — with the containers' ids appended for the layouts inside (`overview/card-1`). */
  page: string;
  viewModels: ViewModels;
  /** The overlay as the cells of THIS layout see it (narrowed for the ones inside a container). */
  userViewModels: UserViewModels | undefined;
  registry: WidgetRegistry;
  layoutEngines: LayoutEngineRegistry;
  actions: ActionRegistry | undefined;
  predicates: PredicateRegistry | undefined;
  appearances: AppearanceRegistry | undefined;
  store: Store;
  bus: EventBus;
  /** The page's reporter of a crash it isolated — a widget's inside a container as much as its own. */
  onError: ((report: PageError) => void) | undefined;
  /** How many layouts deep this one is: 0 for the page. */
  depth: number;
}

export const PageContext = createContext<PageScope | undefined>(undefined);

/** The cell a widget is rendered in — what a container needs to name the layouts it holds. */
export const CellKeyContext = createContext<string | undefined>(undefined);

export const usePageScope = (): PageScope | undefined => useContext(PageContext);
export const useCellKey = (): string | undefined => useContext(CellKeyContext);
