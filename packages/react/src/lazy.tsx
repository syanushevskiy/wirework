/**
 * LAZY components (doc/ADR/0018-lazy-widgets.md): a component whose code is
 * asked for when it is first needed — a widget's, or a layout engine's
 * renderer. `lazyComponent(() => import("./code-editor"), { name })` is a
 * component like any other, so every place that renders a definition's
 * `component` keeps working; the registries, the resolver and validation
 * never learn the word.
 *
 * It shows a quiet placeholder while its code is on the way and, when the
 * code does not arrive, a problem with "Load again" — a rejected import is
 * asked for again, never remembered for good. The code is asked for ONCE
 * however many cells show the component, and may be asked for ahead of the
 * first render (`preload`, usePreload.ts).
 */
import { useEffect, useSyncExternalStore, type ComponentType } from "react";

/** What `import("./file")` gives: a module whose default export is the component. */
export type ComponentLoader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface LazyOptions {
  /** What the problem names when the code does not arrive: the widget's type, the engine's name. */
  name: string;
  /** The placeholder's least height (a CSS length) where a cell sizes to its content; 4.5rem when absent. */
  minHeight?: string | undefined;
}

export type Loaded<P> =
  | { status: "idle" | "loading" }
  | { status: "ready"; component: ComponentType<P> }
  | { status: "failed"; error: Error };

/** The loading of one lazy component, for whoever wants to start it early or show its state. */
export interface Loading<P = never> {
  /** Ask for the code now, unless it was asked for already. */
  preload(): void;
  /** Ask AGAIN after a failure. */
  retry(): void;
  subscribe(listener: () => void): () => void;
  snapshot(): Loaded<P>;
}

const LOADING = Symbol.for("wirework.loading");

export type LazyComponent<P> = ComponentType<P> & { [LOADING]: Loading<P> };

const asError = (thrown: unknown): Error => (thrown instanceof Error ? thrown : new Error(String(thrown)));

export function lazyComponent<P extends object>(load: ComponentLoader<P>, options: LazyOptions): LazyComponent<P> {
  let current: Loaded<P> = { status: "idle" };
  const listeners = new Set<() => void>();
  const move = (next: Loaded<P>): void => {
    current = next;
    listeners.forEach((listener) => listener());
  };
  const ask = (): void => {
    move({ status: "loading" });
    // Asked for NOW, inside a promise: a loader that throws before it returns its own fails like one that rejects.
    new Promise<{ default: ComponentType<P> }>((resolve) => resolve(load()))
      .then((module) => {
        if (typeof module.default !== "function") throw new Error("the module has no default export to render");
        move({ status: "ready", component: module.default });
      })
      .catch((thrown: unknown) => move({ status: "failed", error: asError(thrown) }));
  };
  const loading: Loading<P> = {
    preload: () => {
      if (current.status === "idle") ask();
    },
    retry: () => {
      if (current.status === "failed") ask();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => current,
  };

  function Lazy(props: P) {
    const loaded = useSyncExternalStore(loading.subscribe, loading.snapshot, loading.snapshot);
    // Shown without anybody having asked ahead (a preview, a widget that just appeared): ask now.
    useEffect(() => loading.preload(), []);
    if (loaded.status === "ready") {
      const Component = loaded.component;
      return <Component {...props} />;
    }
    if (loaded.status === "failed") {
      return (
        <div
          role="alert"
          className="ww-widget-error"
          data-testid="widget-error"
          data-widget={options.name}
          data-problem="load-failed"
        >
          &quot;{options.name}&quot; could not be loaded: {loaded.error.message}{" "}
          <button type="button" className="ww-cell-action" data-testid="widget-load-again" onClick={loading.retry}>
            Load again
          </button>
        </div>
      );
    }
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={`Loading ${options.name}`}
        className="ww-cell-loading"
        data-testid="cell-loading"
        // The one inline style the guidelines allow: computed from what the implementation said.
        style={options.minHeight === undefined ? undefined : { minHeight: options.minHeight }}
      />
    );
  }
  Lazy.displayName = `Lazy(${options.name})`;
  return Object.assign(Lazy, { [LOADING]: loading });
}

/** The loading of a component, when it is a lazy one (a definition's `component` and `renderer` are opaque slots). */
export function loadingOf(component: unknown): Loading | undefined {
  return typeof component === "function" && LOADING in component
    ? (component as { [LOADING]: Loading })[LOADING]
    : undefined;
}

/** What a component that is not lazy reads: nothing was asked for, nothing will change. */
const NOTHING: Loaded<never> = { status: "idle" };
const neverChanges = (): (() => void) => () => undefined;
const nothingToLoad = (): Loaded<never> => NOTHING;

/**
 * What a cell says about its widget's code: whether it is on the way
 * (`data-loading`), and a failure reported to the host once — the
 * placeholder and the problem themselves are the lazy component's own.
 */
export function useCellLoading(component: unknown, onError?: (error: Error) => void): boolean {
  const loading = loadingOf(component);
  const loaded = useSyncExternalStore(
    loading?.subscribe ?? neverChanges,
    loading?.snapshot ?? nothingToLoad,
    loading?.snapshot ?? nothingToLoad,
  );
  const error = loaded.status === "failed" ? loaded.error : undefined;
  useEffect(() => {
    if (error !== undefined) onError?.(error);
    // The reporter is the host's and may be a new function every render: one report per failure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
  return loading !== undefined && (loaded.status === "idle" || loaded.status === "loading");
}
