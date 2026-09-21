/**
 * The table view as an ACTION — what a page's reactions call:
 *
 *   { call: "table-view/load", with: { url: "/api/v1/view/jobs", into: "jobs" } }
 *
 * The url is all that is needed; `with` may add what the page wants
 * different from the server's description (hide a column, other filter
 * values, fixed filters and order: see `tableViewSchema`). The call that
 * has the url DECLARES the view; every other reaction — a page change, a
 * refresh, a filter — only names it: `with: { into: "jobs" }`.
 *
 * A factory over the host's transport, like every action that needs a host
 * service (doc/actions-design.md, "Registration").
 */
import type { ActionDefinition } from "@wirework/schema";
import type { TableViewTransport } from "./api";
import { createTableViewLoader, tableViewArgsSchema } from "./loader";

export const TABLE_VIEW_LOAD = "table-view/load";

export function createTableViewActions(options: { transport: TableViewTransport }): ActionDefinition[] {
  const load = createTableViewLoader(options.transport);
  return [
    {
      name: TABLE_VIEW_LOAD,
      description:
        'Load a table the server describes: with { url, into } declares it (columns, filters, rows and total land under <into>); with { into } re-requests it',
      // What a builder asks for, and what boot validation checks `with` against.
      params: tableViewArgsSchema,
      handler: ({ store, args }) => load(store, args),
    },
  ];
}
