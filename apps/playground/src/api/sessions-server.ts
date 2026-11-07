/**
 * Fake SESSIONS endpoint of the demo application: who is signed in, as a
 * table the server describes (the Wirework admin's Sessions card,
 * doc/roles-design.md). Three rows — the demo's people — and the columns
 * with the first answer; a session without the Wirework admin role is refused.
 */
import type { TableViewRequest, TableViewResponse } from "@wirework/table-view";
import { DEMO_ROLES, samplePeople } from "@wirework/view-data-models-examples";
import { tracked } from "./requests";
import { forbidden, SESSIONS_VIEW_URL, type FakeEndpoint } from "./transport";

const column = (id: string, headerName: string) => ({
  id,
  headerName,
  type: "varchar(l)",
  description: null,
  filterValues: null,
  isFilterable: false,
  isHidden: false,
  isSortable: false,
});

const rows = DEMO_ROLES.map((person) => {
  const { id, name, title, roles } = samplePeople[person];
  return { id, name, title, roles: roles.join(", ") };
});

export function createSessionsEndpoint(options: { latencyMs: number }): FakeEndpoint {
  return (request: TableViewRequest, session) => {
    if (!session.roles.includes("wirework-admin")) return forbidden(SESSIONS_VIEW_URL);
    const answer: TableViewResponse = {
      ...(request.metadata
        ? {
            metadata: {
              columnDefinitions: [column("name", "Name"), column("title", "Title"), column("roles", "Roles")],
              enableFilter: false,
              enableSorting: false,
            },
          }
        : {}),
      ...(request.totalRecords ? { totalRecords: rows.length } : {}),
      data: rows,
    };
    return tracked(
      new Promise((resolve) => {
        setTimeout(() => resolve(answer), options.latencyMs);
      }),
    );
  };
}
