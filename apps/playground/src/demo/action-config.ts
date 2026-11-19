/**
 * The demo's action PRESETS (doc/ADR/0005-actions.md, "Hundreds of actions"):
 * the arguments users attach most often, each under a name a user — or a
 * model — understands. The builder's picker offers presets first; a
 * reaction refers to one by id (`{ call, preset }`) and may override fields
 * of `with`. Typed here against each action's parameter schema, but plain
 * JSON: the server's own presets merge in by id at boot, and a preset the
 * action refuses is a boot problem.
 *
 * Preset ids follow the action grammar (`ACTION_NAME`: namespace/name).
 * EXAMPLE of the proposed shape — nothing loads it yet (phase 5).
 */
import { z } from "zod";
import { TABLE_VIEW_LOAD, tableViewArgsSchema } from "@wirework/table-view";
import { appPathSchema } from "@wirework/widget-contracts";
import { RUNS_VIEW_URL } from "../api/transport";
import { preset, type ActionPreset } from "../actions/action-presets";

/** The actions the presets configure. With phase 4 these are the registered definitions themselves. */
const tableViewLoad = { name: TABLE_VIEW_LOAD, params: tableViewArgsSchema };
/** `nav/go` checks `to` in its handler today; a preset needs it DECLARED (phase 4). */
const navGo = { name: "nav/go", params: z.object({ to: appPathSchema }).strict() };

export const actionPresets: Record<string, ActionPreset> = {
  "runs/table": preset(tableViewLoad, {
    label: "Load the runs table",
    description: "The server describes the columns and the filters; five rows a page",
    tags: ["runs", "table", "load"],
    with: { url: RUNS_VIEW_URL, into: "pagination", metadata: true, pageSize: 5 },
  }),
  "runs/table-refresh": preset(tableViewLoad, {
    label: "Refresh the runs table",
    description: "Re-request the rows of the view the page declared",
    tags: ["runs", "table", "refresh"],
    with: { into: "pagination" },
  }),
  "nav/to-runs": preset(navGo, {
    label: "Open the Pagination page",
    tags: ["navigate", "runs"],
    with: { to: "/demo/pagination" },
  }),
};
