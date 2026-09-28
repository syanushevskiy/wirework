/**
 * ALL page-toolbar logic lives here (guidelines: render-only components):
 * what the toolbar above a page offers — the engine choice while the page
 * is empty, the edit session's Edit / Save / Cancel with its pending count,
 * the user-overlay switch and where edits go — and WHY a control is locked,
 * as a reason code the UI says in its own words. The facts come from the
 * host's composition of `useBuilder` and `usePageEditing`; this hook only
 * decides what the toolbar shows.
 */
import type { EditLock, EngineLock, OverlayLock } from "./locks";
import type { EditTarget } from "./use-page-editing";

export interface PageToolbarInput {
  /** The layout engines a builder may choose from while the page is empty. */
  engines: readonly string[];
  /** The engine of the shown template — undefined while the page does not resolve. */
  engine: string | undefined;
  engineLock: EngineLock | undefined;
  onSelectEngine: (engine: string) => void;
  editing: boolean;
  pendingChanges: number;
  editLock: EditLock | undefined;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  /** The overlay as the user wants it; with a lock it is off whatever they want. */
  overlay: boolean;
  overlayLock: OverlayLock | undefined;
  onToggleOverlay: (on: boolean) => void;
  target: EditTarget;
}

export function usePageToolbar({
  engines,
  engine,
  engineLock,
  onSelectEngine,
  editing,
  pendingChanges,
  editLock,
  onEdit,
  onSave,
  onCancel,
  overlay,
  overlayLock,
  onToggleOverlay,
  target,
}: PageToolbarInput) {
  return {
    /** The engine is still a free choice: the names to offer and the one chosen so far. Absent once locked. */
    engineChoice: engineLock === undefined ? { engines, chosen: engine } : undefined,
    engine,
    engineLock,
    selectEngine: onSelectEngine,
    /** Whether the page resolved to a template: only then is there something to edit. */
    hasPage: engine !== undefined,
    mode: editing ? ("editing" as const) : ("view" as const),
    editing,
    pendingChanges,
    editLock,
    edit: onEdit,
    save: onSave,
    cancel: onCancel,
    overlay: overlay && overlayLock === undefined,
    overlayLock,
    toggleOverlay: onToggleOverlay,
    target,
  };
}

export type PageToolbarState = ReturnType<typeof usePageToolbar>;
