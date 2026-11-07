/**
 * Why a control is not offered right now — as a FACT, never a sentence.
 * The headless hooks report a reason code; the UI says it in its own words
 * (@wirework/antd-builder ships English defaults a host can replace), so
 * no user-facing text lives in this package.
 */

/** Why the builder's Add is locked: the user may not change pages, a page edit is open, a user's own view is shown, or a role is edited for (doc/roles-design.md). */
export type AddLock = "permission" | "editing" | "user-view" | "role-view";

/** Why the page cannot be edited: the user may not, or whether they may is not known yet. */
export type EditLock = "permission" | "loading";

/**
 * Why the layout engine can no longer be chosen: widgets are placed (there
 * is no conversion between engines), the page has no template to choose
 * for, or the page's engine is configuration rather than a builder's choice.
 */
export type EngineLock = "widgets-placed" | "no-template" | "configured";

/** Why the user overlay cannot be turned on: there is nothing to personalise yet. */
export type OverlayLock = "no-widgets";

/**
 * Why a page view cannot be chosen: the choice lives in the user overlay,
 * which is off (the page shows its default), or the page has no templates.
 */
export type ViewsLock = "overlay-off" | "no-page";

/**
 * Why a page view could not be made, renamed or imported — a code the UI
 * says in words (doc/page-views-design.md).
 */
export type ViewProblem =
  | { kind: "empty-name" }
  | { kind: "dotted-name" }
  /** A view of either kind already has the name: a user view would shadow a prebuilt one, or the other way round. */
  | { kind: "name-taken"; name: string }
  /** The text is not a Wirework page-view file: unparsable, another kind or version, a field missing. */
  | { kind: "not-a-view"; detail: string }
  | { kind: "other-page"; page: string }
  /** The registered layout engine refuses the template, or there is no engine of that name. */
  | { kind: "invalid-template"; detail: string }
  | { kind: "permission" }
  /** Nothing is shown to copy or share (the page did not resolve). */
  | { kind: "no-view" };
