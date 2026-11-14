/**
 * ALL page-toolbar logic lives here (guidelines: render-only components):
 * what the toolbar above a page offers — the engine choice while the page
 * is empty, the edit session's Edit / Save / Cancel with its pending count,
 * the user-overlay switch, the ROLE edited for (doc/ADR/0012-roles.md) and
 * where edits go — and WHY a control is locked, as a reason code the UI
 * says in its own words. The facts come from the host's composition of
 * `useBuilder` and `usePageEditing`; this hook only decides what the
 * toolbar shows.
 */
import { useState } from "react";
import { ROLE_NAME } from "@wirework/schema";
import { chainSteps } from "@wirework/engine";
import type { EditLock, EngineLock, OverlayLock } from "./locks";
import { roleOf, type EditTarget } from "./page-edits";

/** Why a role name typed in the toolbar cannot be added yet — or nothing, when it can (doc/ADR/0012-roles.md). */
export function roleNameProblem(name: string, known: readonly string[]): string | undefined {
  if (name === "") return "type a role name";
  if (!ROLE_NAME.test(name)) return "a role name is kebab-case — letters, digits and dashes, like app-user";
  if (known.includes(name)) return `the role "${name}" is already there`;
  return undefined;
}

/** One step of the breadcrumb from the page down to the layout shown: the page, then a container per step. */
export interface LayoutCrumb {
  label: string;
  /** What to show when it is followed: the page itself (undefined) or the chain down to this step. */
  at: string | undefined;
}

export interface PageToolbarInput {
  /** The page shown, and — when the layout shown sits inside its containers (doc/ADR/0009-containers.md) — the chain to it. */
  page: string;
  at?: string | undefined;
  /** Show the page itself (undefined) or the layout at a chain: following a breadcrumb. */
  onGoTo?: ((at: string | undefined) => void) | undefined;
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
  /**
   * The roles a builder may edit FOR (doc/ADR/0012-roles.md) — every role the
   * application grants, as the host knows them. With `onSelectRole`, the
   * toolbar offers the choice: everyone, or one of them.
   */
  knownRoles?: readonly string[] | undefined;
  /** Edit for a role (its name), or for everyone (undefined). */
  onSelectRole?: ((role: string | undefined) => void) | undefined;
  /**
   * Add a role the application grants: the host puts it where it keeps its
   * roles (the demo: `app.lists.roles`). With it, the toolbar offers an
   * "add a role" field beside the role choice.
   */
  onAddRole?: ((role: string) => void) | undefined;
}

export function usePageToolbar({
  page,
  at,
  onGoTo,
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
  knownRoles,
  onSelectRole,
  onAddRole,
}: PageToolbarInput) {
  /** The role name being typed into "add a role"; empty between additions. */
  const [roleName, setRoleName] = useState("");
  const known = knownRoles ?? [];
  const roleProblem = roleNameProblem(roleName, known);
  const addRole = () => {
    if (onAddRole === undefined || roleProblem !== undefined) return;
    onAddRole(roleName);
    setRoleName("");
  };
  /** The page, then one crumb per container down to the layout shown: `builder › card-1`. */
  const crumbs: LayoutCrumb[] = [
    { label: page, at: undefined },
    ...(at === undefined
      ? []
      : chainSteps(at).map((step) => ({
          label: step.layoutPath === "content" ? step.cell : `${step.cell} · ${step.layoutPath}`,
          at: step.at,
        }))),
  ];
  return {
    crumbs,
    goTo: onGoTo,
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
    /**
     * The role to edit for, as a choice: the roles on offer and the one
     * chosen (undefined: everyone). Absent when the host lists no roles or
     * takes no choice.
     */
    roleChoice:
      onSelectRole !== undefined && (known.length > 0 || onAddRole !== undefined)
        ? { roles: known, chosen: roleOf(target) }
        : undefined,
    selectRole: onSelectRole,
    /**
     * "Add a role": the name typed, why it cannot be added yet (nothing
     * while the field is empty — an empty field is no mistake), and the
     * act. Absent when the host takes no new roles.
     */
    newRole:
      onAddRole === undefined
        ? undefined
        : {
            name: roleName,
            problem: roleName === "" ? undefined : roleProblem,
            canAdd: roleProblem === undefined,
            change: setRoleName,
            add: addRole,
          },
  };
}

export type PageToolbarState = ReturnType<typeof usePageToolbar>;
