/**
 * Why a control is not offered right now — as a FACT, never a sentence.
 * The headless hooks report a reason code; the UI says it in its own words
 * (@wirework/antd-builder ships English defaults a host can replace), so
 * no user-facing text lives in this package.
 */

/** Why the builder's Add is locked: the user may not change pages, a page edit is open, or a user's own view is shown. */
export type AddLock = "permission" | "editing" | "user-view";

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
