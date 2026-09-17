/**
 * User View Models
 *
 * User defaults and customisation applied ON TOP of the View Models:
 * which template ("view") the user selected for each page/panel and the
 * user's per-template settings overrides.
 */

/** User's customisation of a single panel. */
export interface PanelUserViewModel {
  /** Selected view model template for the panel. */
  view: string;
  /**
   * Per-template user's settings overrides,
   * keyed by template name ("default", "simple", "e2e", ...).
   */
  settings: Record<string, Record<string, unknown>>;
}

/** User's customisation of a single page. */
export interface PageUserViewModel {
  /** Selected view model template for the page. */
  view: string;
  /** Panel customisations keyed by panel name. */
  panels: Record<string, PanelUserViewModel>;
}

/** Root user view model. */
export interface UserViewModels {
  /** Page customisations keyed by page name. */
  pages: Record<string, PageUserViewModel>;
  /** < ... other UI user specific settings ... > */
  [setting: string]: unknown;
}

/* ------------------------------------------------------------------ */
/* Data (transcribed from the whiteboard sketch)                       */
/* ------------------------------------------------------------------ */

export const userViewModels: UserViewModels = {
  pages: {
    runs: {
      view: "default",
      panels: {
        filters: {
          view: "default",
          settings: {
            default: {
              /* < ... default template user's settings ... > */
            },
            simple: {
              /* < ... simple template user's settings ... > */
            },
          },
        },
        table: {
          view: "default",
          settings: {
            default: {
              /* < ... default template user's settings ... > */
            },
            e2e: {
              /* < ... e2e template user's settings ... > */
            },
          },
        },
        // < ... other panels ... >
      },
    },
    // < ... other pages ... >
  },
  // < ... other UI user specific settings ... >
};
