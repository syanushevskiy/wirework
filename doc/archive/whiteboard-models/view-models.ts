/**
 * View Models
 *
 * Describe HOW pages and panels are rendered:
 *  - `pages`  — page layouts (rows/cells) built by a layout engine,
 *  - `panels` — per-component view configurations (templates).
 *
 * Each page and panel can have several named templates
 * (e.g. "default", "simple", "e2e", "my own").
 */

/** Layout engine used to arrange a page. */
export type LayoutEngine = "flex-rows";

/**
 * Cell width.
 * Either a keyword ("full", "auto") or a responsive spec,
 * e.g. "m-8/12 s-1/2" — 8/12 on medium screens, 1/2 on small ones.
 */
export type CellWidth = string;

/** A single cell of a layout row — places one component (panel) on the page. */
export interface LayoutCell {
  /** Component name (panel to render in this cell). */
  panel: string;
  /** Layout properties. */
  height?: string;
  width?: CellWidth;
  /** Path to the component's view model, e.g. "panels.runs.filters". */
  model: string;
  /** Which template of that view model to use. */
  default: string;
}

/** Rows of cells, both keyed by ordinal number. */
export type LayoutRows = Record<number, Record<number, LayoutCell>>;

/** Page's view model — layout engine + rows of component cells. */
export interface PageViewModel {
  /** Layout engine. */
  engine: LayoutEngine;
  rows: LayoutRows;
}

/* ------------------------------------------------------------------ */
/* Filters panel                                                       */
/* ------------------------------------------------------------------ */

/**
 * Default value of a select element:
 * either picked by selector ("first" | "last" | ...) — or — a fixed value.
 */
export type SelectDefault =
  | { selector: "first" | "last" | string }
  | { value: string };

/** Multi/single select backed by a remote source. */
export interface SelectFilterElement {
  label: string;
  type: "select";
  "multi-select": boolean;
  /** Endpoint providing the options. */
  source: string;
  default?: SelectDefault;
  /** Property of the data-model filters this element is bound to. */
  model: string;
}

/** Date (optionally a range) picker. */
export interface DateFilterElement {
  label: string;
  type: "date";
  range: boolean;
}

/** Free-text input validated by a pattern. */
export interface InputFilterElement {
  label: string;
  type: "input";
  pattern: string;
}

export type FilterElement =
  | SelectFilterElement
  | DateFilterElement
  | InputFilterElement;

/** Filters panel view model (one template). */
export interface FiltersPanelViewModel {
  name: string;
  /** Path to the filters data model, e.g. "runs.filters". */
  model: string;
  /** Path to the compiled query in the data model. */
  query: string;
  /** Filter elements keyed by element name. */
  elements: Record<string, FilterElement>;
}

/* ------------------------------------------------------------------ */
/* Table panel                                                         */
/* ------------------------------------------------------------------ */

export type TableColumnType = "text" | "link" | "actions";

/** A table column definition. */
export interface TableColumn {
  /** Column header. */
  name: string;
  /** Property of the row data object to display. May be a path ("status.state"). */
  property: string;
  type: TableColumnType;
  /** For "link" columns — URL template with ${...} placeholders. */
  url?: string;
  /** For "actions" columns — available actions. TBD. */
  actions?: unknown;
}

/** Table panel view model (one template). */
export interface TablePanelViewModel {
  /** Path to the rows in the data model, e.g. "runs.data.current". */
  data: string;
  /** Path to the sort order in the data model. */
  sorting: string;
  /** Columns keyed by ordinal number. */
  columns: Record<number, TableColumn>;
  /** Table specific settings: visibility, look and feel, etc. */
  settings?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Refresher panel                                                     */
/* ------------------------------------------------------------------ */

/** Refresher panel view model — periodically reloads data. */
export interface RefresherPanelViewModel {
  /** Endpoint template with ${...} placeholders resolved from data models. */
  endpoint: string;
  /** Path in the data model to store the current page into. */
  data: string;
  /** Path in the data model to the pages cache. */
  cache: string;
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

/** Named templates of a view model ("default", "simple", "e2e", ...). */
export type Templates<T> = Record<string, T>;

export interface ViewModels {
  /** Page's view models: page -> template -> layout. */
  pages: {
    runs: Templates<PageViewModel>;
  };
  /** Component view models: page -> panel -> template -> config. */
  panels: {
    runs: {
      filters: Templates<FiltersPanelViewModel>;
      table: Templates<TablePanelViewModel>;
      refresher: Templates<RefresherPanelViewModel>;
    };
  };
}

/* ------------------------------------------------------------------ */
/* Data (transcribed from the whiteboard sketch)                       */
/* ------------------------------------------------------------------ */

export const viewModels: ViewModels = {
  pages: {
    runs: {
      // Page's view model
      default: {
        // Layout engine
        engine: "flex-rows",
        rows: {
          1: {
            1: {
              // Component name
              panel: "filters",
              // Layout properties
              height: "auto",
              width: "full",
              // Component's view model
              model: "panels.runs.filters",
              default: "default",
            },
          },
          2: {
            1: {
              width: "m-8/12 s-1/2",
              panel: "pagination",
              model: "panels.runs.pagination",
              default: "default",
            },
            2: {
              width: "m-4/12 s-1/2",
              panel: "refresher",
              model: "panels.runs.refresher",
              default: "default",
            },
          },
          3: {
            1: {
              width: "full",
              panel: "table",
              model: "panels.runs.table",
              default: "default",
            },
          },
          4: {
            1: {
              width: "m-8/12 s-1/2",
              panel: "pagination",
              model: "panels.runs.pagination",
              default: "default",
            },
            2: {
              width: "m-4/12 s-1/2",
              panel: "spacer",
              model: "misc.spacer",
              default: "default",
            },
          },
        },
      },
      // simple: { < ... > } — simplified page template
    },
  },

  panels: {
    runs: {
      filters: {
        default: {
          name: "default",
          model: "runs.filters",
          query: "runs.filters.query",
          elements: {
            application: {
              label: "Application",
              type: "select",
              "multi-select": true,
              source: "https://workbench/api/v3/applicaitons",
              // Either a selector ("first" | "last" | ...) — or — a fixed value
              default: { value: "ABC" },
              model: "applications",
            },
            // < ... >
            started: {
              label: "Started",
              type: "date",
              range: true,
            },
            // < ... >
            search: {
              label: "Search",
              type: "input",
              pattern: ".*",
            },
          },
        },
        // simple: { < simple filter > },
        // "my own": { < ... > } — user defined template
      }, // filters

      table: {
        default: {
          data: "runs.data.current",
          sorting: "runs.filters.order",
          columns: {
            1: {
              name: "#",
              property: "id",
              type: "link",
              url: "/v3/applications/${application}/runs/${id}",
            },
            2: {
              name: "Name",
              property: "name",
              type: "text",
            },
            3: {
              name: "Reference",
              property: "reference",
              type: "text",
            },
            4: {
              name: "Inbound",
              property: "inbound",
              type: "link",
              url: "/v3/applications/${application}/runs/${id}/inbounds/${inbound}",
            },
            5: {
              name: "Status",
              property: "status.state",
              type: "text",
            },
            6: {
              name: "Actions",
              property: "actions",
              type: "actions",
              actions: {
                /* < TBD > */
              },
            },
          },
          settings: {
            /* < ... table specific settings: visibility, look and feel, etc. ... > */
          },
        },
        // e2e: { < ... > } — e2e runs template
      }, // table

      refresher: {
        default: {
          endpoint:
            "https://workbench/api/v3/runs?${runs.filters.query}&page=${runs.pagination.current}",
          data: "runs.data.current",
          cache: "runs.pages",
        },
      },
    }, // runs
  }, // panels
};
