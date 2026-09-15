/**
 * @wirework/react — React adapter for the framework-agnostic Wirework engine.
 * Rendering (PageView, delegating layout to the registered engine plugin),
 * React hooks (usePagePlan, useStorePath, useWidgetEvent, useReactions),
 * the React-typed widget definition and the React-typed layout-engine
 * definition live here; the engine itself knows nothing about React.
 */
export { defineWidget } from "./definition";
export type { ReactWidgetDefinition } from "./definition";
export { defineLayoutEngine } from "./layout";
export type { LayoutRendererProps, ReactLayoutEngine } from "./layout";
export { CellChrome } from "./CellChrome";
export type { CellChromeProps } from "./CellChrome";
export { PageView } from "./PageView";
export type { PageViewProps } from "./PageView";
export { usePagePlan } from "./usePagePlan";
export { useReactions } from "./useReactions";
export { useStorePath } from "./useStorePath";
export { useStoreSnapshot } from "./useStoreSnapshot";
export { useWidgetEvent } from "./useWidgetEvent";
export { WidgetErrorBoundary } from "./WidgetErrorBoundary";
