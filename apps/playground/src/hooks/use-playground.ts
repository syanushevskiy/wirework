/**
 * The playground's HOST logic for one page visit (guidelines: components are
 * render-only): the visit's opening, the overlay switch, live validation,
 * the permission, this demo's stand-in for persistence, and the reload key.
 * The builder itself is @wirework/builder — `usePageEditing` (the edit
 * session), `useBuilder` (placing widgets), `usePageToolbar` (what the
 * toolbar offers), `usePageViews` (the page's prebuilt and own views) and
 * `useCommit` (the one write path) — composed here with what only this
 * application knows. One-time boot (registries, pages,
 * rejection proof) is `boot.ts`; this demo's own event wiring is
 * use-demo-bridge.
 *
 * The hook serves ONE page visit, which the router's loader opened
 * (router.tsx, boot.ts): the visit's store and bus, from that page's
 * initial state, so the state inspector shows exactly what this page put
 * there, step by step. The component using it is keyed by the visit, so
 * all state here starts over with it. BOTH trees LIVE IN THE STORE —
 * "viewModels" and "userViewModels" — alongside the data: one
 * state-management tree (for a demo page, the application's global state
 * layered under the visit's own — `layerStores` in boot.ts). The state
 * inspector edits it, widgets write into it (through reactions), editors
 * save into it, and the page re-renders reactively from it.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserViewModels, ViewModels } from "@wirework/schema";
import { stampProblem, validateViewModels } from "@wirework/engine";
import { useStorePath } from "@wirework/react";
import {
  DEFAULT_BUILDER_NAMING,
  builderPage,
  roleOf,
  useBuilder,
  useCommit,
  useLayoutNavigation,
  usePageEditing,
  usePageExport,
  usePageImport,
  usePageToolbar,
  usePageViews,
  type AddLock,
  type EditLock,
  type EditTarget,
  type OverlayLock,
  type SaveTrees,
} from "@wirework/builder";
import { DEMO_ROLES, samplePeople, type DemoRole } from "@wirework/view-data-models-examples";
import type { PageVisit, Playground } from "../boot";
import { PAGE_ROUTES } from "../routes";
import { builderStateSections, demoStateSections } from "../state-sections";
import { useDemoBridge } from "./use-demo-bridge";

/** The page the widget builder adds to. */
export const BUILDER_PAGE = "builder";
/** The container "Wrap in a card" wraps a cell in. */
const CARD_WIDGET = "antd-card";
/** The role whose holders add widgets to the application's pages. */
const ADMIN_ROLE = "admin";

/** What a store without the trees means (the inspector can remove them): no pages, loudly. */
const NO_VIEW_MODELS: ViewModels = { pages: {}, widgets: {} };
const NO_USER_VIEW_MODELS: UserViewModels = {};

export function usePlayground(playground: Playground, visit: PageVisit) {
  const { registry, contracts, layoutEngines, actions, predicates, appearances, migrations, rejections } = playground;
  const { page, store, bus } = visit;
  // The page's opening (the first server request, the application's session
  // request) is a side effect: it belongs here, not in the router's loader
  // that created the visit. `start` runs once per visit.
  useEffect(() => visit.start(), [visit]);

  // Reactive: inspector edits, addWidget, editors and saved sessions all go
  // through the store.
  const viewModels = useStorePath<ViewModels>(store, "viewModels") ?? NO_VIEW_MODELS;
  const userViewModels = useStorePath<UserViewModels>(store, "userViewModels") ?? NO_USER_VIEW_MODELS;

  /**
   * The layout shown and edited (doc/ADR/0009-containers.md): the page, or —
   * after "Edit content" on a container — the layout inside it, `at` the
   * chain of containers down to it. Visit state, not an address: a new
   * address would open a new visit, and the builder's starts from nothing.
   * With the overlay on it is the layout the USER sees — their own copy,
   * once they change it.
   */
  const [at, setAt] = useState<string | undefined>(undefined);

  /**
   * The user's views as stored may be of a data format this version cannot
   * read — saved by a newer one (doc/ADR/0017-versioning-and-upgrades.md).
   * They stay in the store exactly as they are and are never written over
   * (`useCommit` refuses); the page shows without them and says so (the plan
   * checks the overlay it is given), and a layout inside a container, which
   * is read through the overlay directly, is shown as if there were none.
   */
  const unreadViews = useMemo(() => stampProblem(userViewModels.versions, migrations), [userViewModels, migrations]);
  const trees = useMemo(
    () => ({
      viewModels,
      userViewModels: unreadViews !== undefined && at !== undefined ? NO_USER_VIEW_MODELS : userViewModels,
    }),
    [viewModels, userViewModels, unreadViews, at],
  );

  /**
   * The user overlay. Every page has one, and a visit starts with it on or
   * off as the page says (boot.ts). On the builder there is nothing to
   * personalise until the shared page holds a widget: until then the
   * overlay is unavailable — and off. (Resolved here rather than taken from
   * `useBuilder`, which needs the edit session that this decides.)
   */
  const builder = builderPage(layoutEngines, viewModels, BUILDER_PAGE, DEFAULT_BUILDER_NAMING);
  const [overlayWanted, setOverlayWanted] = useState(visit.userOverlayOnOpen);
  const overlayLock: OverlayLock | undefined =
    page !== BUILDER_PAGE || (builder.problem === undefined && builder.cells.length > 0) ? undefined : "no-widgets";
  // The page was emptied under an overlay that was on (the inspector can):
  // it goes OFF for good, rather than coming back by itself with the next
  // widget — which would lock Add right after the first one.
  if (overlayWanted && overlayLock !== undefined) setOverlayWanted(false);
  const withUserOverlay = overlayWanted && overlayLock === undefined;

  /**
   * ROLES (doc/ADR/0012-roles.md): the ones this user holds arrive with the
   * session (app.user.roles, from the broadest to the most specific) and
   * the ones the application grants with its lists (app.lists.roles, in
   * that same order) — the roles a builder may edit for. The builder page
   * has no session: nobody holds a role there, and none is on offer until
   * a list is put in the store.
   */
  const roles = useStorePath<string[]>(store, "app.user.roles");
  const knownRoles = useStorePath<string[]>(store, "app.lists.roles");
  /** Who is signed in, as the session says. */
  const person = useStorePath<DemoRole>(store, "app.user.id");

  /** LIVE validation of what is in the store — builder, editor and inspector edits included. */
  const report = useMemo(
    () =>
      validateViewModels({
        registry,
        layoutEngines,
        viewModels,
        userViewModels,
        actions,
        predicates,
        appearances,
        migrations,
        knownRoles,
      }),
    [registry, layoutEngines, viewModels, userViewModels, actions, predicates, appearances, migrations, knownRoles],
  );

  /** This demo's own host-side wiring — not the builder's and not the engine's. */
  useDemoBridge(bus, store);

  /**
   * GLOBAL state at work: what the user may do arrives with the session
   * (app.permissions). It fails CLOSED: until the permission has arrived —
   * and for good if the session request fails — nobody edits. The builder
   * is not part of the application session and has no permission to wait
   * for.
   */
  const editPages = useStorePath<boolean>(store, "app.permissions.editPages");
  const permissionLock: EditLock | undefined =
    page === BUILDER_PAGE || editPages === true ? undefined : editPages === undefined ? "loading" : "permission";
  // With the overlay on, an edit is the user's own view — and views this version cannot read are not written over.
  const editLock: EditLock | undefined =
    permissionLock ?? (withUserOverlay && unreadViews !== undefined ? "newer-data" : undefined);
  const canEditPages = editLock === undefined;

  /**
   * Where a real host PERSISTS its pages. This demo keeps nothing: every
   * visit starts from the fixtures on purpose (visits.feature), so it only
   * records that a save happened — the State panel shows the count. A host
   * that means it writes the trees somewhere and reads them back when it
   * boots:
   *
   *   const persist: SaveTrees = (trees) =>
   *     localStorage.setItem("wirework.pages", JSON.stringify(trees));
   */
  const persist = useCallback<SaveTrees>(() => {
    store.set("saved", (store.get<number>("saved") ?? 0) + 1);
  }, [store]);

  const viewDoor = useMemo(() => ({ migrations, registry }), [migrations, registry]);

  /** THE write path: everything that changes a page goes through it. */
  const commit = useCommit({ store, save: persist, migrations });

  /**
   * With the overlay on, edits are the USER's; with a role chosen in the
   * toolbar they are that ROLE's (doc/ADR/0012-roles.md); otherwise they
   * change the shared page. The page is shown AS the target sees it: this
   * user's roles with the overlay on; for a role, the application's roles
   * up to it — what a person holding it sees; for everyone, none.
   */
  const [roleTarget, setRoleTarget] = useState<string | undefined>(undefined);
  /**
   * An ADMIN's edits are their role's (the owner's rule, 17 November 2026,
   * doc/ADR/0012-roles.md): when the session says who is signed in — on
   * opening, and again after "Sign in as" — an admin starts with the overlay
   * off and their most specific role as the edit target, so Edit page, a
   * placed widget and a rewired one go to that role's view with no choice to
   * make first; anybody else starts as the page says, with their own view.
   * Both are still the toolbar's to change.
   */
  const isAdmin = page !== BUILDER_PAGE && roles?.includes(ADMIN_ROLE) === true;
  const ownRole = isAdmin ? roles?.at(-1) : undefined;
  const [startedAs, setStartedAs] = useState<string | undefined>(undefined);
  if (page !== BUILDER_PAGE && person !== undefined && person !== startedAs) {
    setStartedAs(person);
    setRoleTarget(ownRole);
    setOverlayWanted(ownRole === undefined && visit.userOverlayOnOpen);
  }
  const target = useMemo<EditTarget>(
    () => (withUserOverlay ? "user" : roleTarget === undefined ? "base" : { role: roleTarget }),
    [withUserOverlay, roleTarget],
  );
  const viewerRoles = useMemo(() => {
    const role = roleOf(target);
    if (role === undefined) return target === "user" ? roles : [];
    const held = knownRoles?.indexOf(role) ?? -1;
    return held === -1 ? [role] : knownRoles?.slice(0, held + 1);
  }, [target, roles, knownRoles]);
  const editing = usePageEditing({
    commit,
    canEdit: canEditPages,
    registry,
    layoutEngines,
    actions,
    predicates,
    appearances,
    migrations,
    page,
    at,
    target,
    roles: viewerRoles,
    trees,
    naming: DEFAULT_BUILDER_NAMING,
    // An admin rewires a widget from any session: the wiring goes to the shared template, the settings to the target.
    rewires: isAdmin,
  });

  // The session's stable functions: the callbacks below depend on what they
  // use, not on the session object rebuilt every render.
  const { cancel: cancelEditing, save: saveSession, startEditing, wrapCell } = editing;

  const wrapInCard = useCallback((cellId: string) => wrapCell(cellId, CARD_WIDGET), [wrapCell]);

  /** Toggling the overlay changes the edit target — an open session ends, and a role chosen is let go. */
  const toggleUserOverlay = useCallback(
    (checked: boolean) => {
      cancelEditing();
      setOverlayWanted(checked);
      if (checked) setRoleTarget(undefined);
    },
    [cancelEditing],
  );
  /** Choosing the role to edit for changes the edit target too — the overlay goes off, edits are the role's. */
  const selectRole = useCallback(
    (role: string | undefined) => {
      cancelEditing();
      setRoleTarget(role);
      if (role !== undefined) setOverlayWanted(false);
    },
    [cancelEditing],
  );

  /**
   * "Sign in as" (doc/ADR/0012-roles.md): the session request goes out again
   * for another of the demo's people, and the page is opened again as them.
   * The people on offer, as a select shows them, on the demo's pages only.
   */
  const people = useMemo(
    () =>
      page === BUILDER_PAGE
        ? undefined
        : DEMO_ROLES.map((id) => ({ value: id, label: `${samplePeople[id].name} (${samplePeople[id].title})` })),
    [page],
  );
  const signInAs = useCallback(
    (value: string) => {
      const next = DEMO_ROLES.find((id) => id === value);
      const path = store.get<string>("route.path");
      if (next !== undefined && path !== undefined) void playground.signIn(next, path);
    },
    [playground, store],
  );

  /**
   * Why the builder's Add is not offered right now, if it is not: not
   * without the permission, not in a user's own view (the overlay carries
   * settings, view and layout only) and — on the BUILDER's page — not under
   * an open edit session (it would be silently dropped). For a ROLE it is
   * offered: the widget's template is everyone's and its cell goes into the
   * role's own view (doc/ADR/0012-roles.md), so the role sees one widget
   * more. On the application's pages it is the other way about: widgets are
   * added IN an edit session only (`adding` below), which Add saves first.
   */
  const inApplication = page !== BUILDER_PAGE;
  const addLock: AddLock | undefined = !canEditPages
    ? "permission"
    : editing.editing && !inApplication
      ? "editing"
      : target === "user"
        ? "user-view"
        : undefined;

  /**
   * The page changed under the user's hands — a widget ADDED, a page edit
   * SAVED — so it LOADS AGAIN (`PageView`'s `reloadKey`): the page's `load`
   * event and its widgets' fire by the NEW configuration. A table whose load
   * reaction got another URL, page size or metadata flag shows it at once,
   * not after a reload of the browser. The store is untouched.
   */
  const [reloadKey, setReloadKey] = useState(0);
  const loadAgain = useCallback(() => setReloadKey((loads) => loads + 1), []);

  /** Save page: commit the session; if something was committed, the page loads again — by what was just saved. */
  const savePage = useCallback(() => {
    if (saveSession() === "committed") loadAgain();
  }, [saveSession, loadAgain]);

  /**
   * Moving between the page and the layouts inside its containers is the
   * builder's (`useLayoutNavigation`, doc/ADR/0009-containers.md): "Edit
   * content" opens the layout inside in edit mode, a breadcrumb leads back,
   * a container just placed opens at once — each saving the page first, as
   * Save page does — and widgets are added inside a container on the shared
   * page only. This host says what only it knows: where `at` is kept, what
   * Save page does here, that the page loads again after an Add, and that
   * the builder page's own layout takes widgets.
   */
  const {
    goTo,
    editLayout,
    onAdded,
    adding: takesWidgets,
    addAt,
  } = useLayoutNavigation({
    at,
    onAt: setAt,
    save: savePage,
    startEditing,
    target,
    // The builder's page takes widgets — and so does any page while it is edited FOR A ROLE: the widget's cell goes
    // into the role's own view (doc/ADR/0012-roles.md), everyone else's page as it was.
    addsToPage: page === BUILDER_PAGE || (roleOf(target) !== undefined && at === undefined),
    onChanged: loadAgain,
  });
  const {
    engineLock,
    setEngine: chooseEngine,
    addWidget: placeWidget,
  } = useBuilder({
    store,
    commit,
    canEdit: canEditPages,
    registry,
    layoutEngines,
    page,
    at: addAt,
    naming: DEFAULT_BUILDER_NAMING,
    // Editing for a role: the placed widget's cell lands in the role's own view, through the session's ops.
    context: editing.context,
    cancelEditing,
    onAdded,
  });

  /**
   * On the APPLICATION's pages widgets are added by an ADMIN, IN EDIT MODE
   * only (the owner's rule, 17 November 2026): the palette shows while a
   * layout that takes widgets is being edited by somebody holding the admin
   * role. The builder's page is as it was — it has no session, so nobody
   * there holds a role, and its palette is the page itself.
   *
   * A placed widget is a commit of its own, and an open session would be
   * stale after it: so Add (and choosing the engine of an empty layout)
   * saves what is pending first, like Save page, and opens the session
   * again — the admin stays in edit mode. Cancel after it drops only what
   * was changed since.
   */
  const adding = takesWidgets && (!inApplication || (editing.editing && isAdmin));
  const addWidget = useCallback<typeof placeWidget>(
    (...placed) => {
      if (!inApplication) return placeWidget(...placed);
      saveSession();
      placeWidget(...placed);
      startEditing();
    },
    [inApplication, placeWidget, saveSession, startEditing],
  );
  const setEngine = useCallback<typeof chooseEngine>(
    (name) => {
      chooseEngine(name);
      if (inApplication) startEditing();
    },
    [inApplication, chooseEngine, startEditing],
  );

  const toolbar = usePageToolbar({
    page,
    at,
    onGoTo: goTo,
    engines: layoutEngines.keys(),
    engine: editing.engine,
    // A demo page's engine is its configuration; the builder's — and an empty layout inside a container — is a choice.
    engineLock: takesWidgets ? engineLock : "configured",
    onSelectEngine: setEngine,
    editing: editing.editing,
    pendingChanges: editing.pendingChanges,
    editLock,
    onEdit: startEditing,
    onSave: savePage,
    onCancel: cancelEditing,
    overlay: withUserOverlay,
    overlayLock,
    onToggleOverlay: toggleUserOverlay,
    target,
    knownRoles,
    onSelectRole: selectRole,
    // The roles the application grants are a LIST in the store (app.lists.roles, doc/ADR/0012-roles.md): a builder adds one there.
    onAddRole: (role) => store.set("app.lists.roles", [...(knownRoles ?? []), role]),
  });

  /**
   * The page's VIEWS (doc/ADR/0006-page-views.md): the team's prebuilt
   * templates, the held roles' and the user's own, chosen in the overlay or
   * for a role; Save as and Import write where the edit target says — the
   * overlay, the role's entry, or the shared page.
   */
  const views = usePageViews({
    commit,
    editLock,
    layoutEngines,
    page,
    trees,
    shownTrees: editing.shownTrees,
    target,
    roles: viewerRoles,
    shown: editing.pageView,
    cancelEditing,
    // A shared view of an older data format is brought forward on Import; a newer one is refused.
    door: viewDoor,
  });

  /**
   * The whole SHARED page as a file (doc/ADR/0011-pages-as-code.md): what an
   * admin downloads and hands to a developer. The route is this host's to
   * know — the file carries it so a page can be loaded at its address.
   */
  const route = useMemo(() => {
    const found = PAGE_ROUTES.find((candidate) => candidate.page === page);
    return found === undefined ? undefined : { path: found.path, title: found.title, menu: found.menu };
  }, [page]);
  const exporting = usePageExport({ registry, layoutEngines, viewModels, page, route, editLock });

  /**
   * The same file IMPORTED (doc/ADR/0011-pages-as-code.md, "Import page"):
   * what another admin exported takes the shared page's place — checked as a
   * file from somebody else — and the page loads again by it, from its top.
   */
  const onImported = useCallback(() => {
    setAt(undefined);
    loadAgain();
  }, [loadAgain]);
  const importing = usePageImport({
    commit,
    editLock,
    cancelEditing,
    onImported,
    page,
    viewModels,
    registry,
    layoutEngines,
    actions,
    predicates,
    appearances,
    migrations,
    knownRoles,
  });

  // The State panel's editors (state-sections.ts): a demo page's own data and views, the global settings and
  // session; the builder's store whole.
  const stateSections = useMemo(
    () => (page === BUILDER_PAGE ? builderStateSections : demoStateSections(page, { registry, layoutEngines })),
    [page, registry, layoutEngines],
  );

  return {
    stateSections,
    registry,
    contracts,
    layoutEngines,
    actions,
    predicates,
    appearances,
    store,
    bus,
    report,
    rejections,
    page,
    target,
    /** The roles the page is shown as (doc/ADR/0012-roles.md): the user's, or the one edited for. */
    roles: viewerRoles,
    /** "Sign in as": the demo's people as options, the one signed in, and the switch — on the demo's pages only. */
    people,
    person,
    signInAs,
    adding,
    addLock,
    addWidget,
    editLayout,
    wrapInCard,
    toolbar,
    views,
    exporting,
    importing,
    /** The editor's wiring fields are locked in an overlay's session — a user's own view, a role's — except for an admin. */
    bindingsLocked: target !== "base" && !isAdmin,
    ...editing,
    reloadKey,
  };
}
