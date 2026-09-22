/**
 * Navigation as ACTIONS: a page never touches the router. A reaction names `nav/go` and where to go, or
 * `nav/follow` to go where the event's link points; the HOST owns the
 * router and hands the actions a Navigator — the same factory pattern as
 * every other host service (doc/actions-design.md). Both only ever go to an
 * address of the application (appPathSchema): never another origin.
 */
import { z } from "zod";
import { getPath, type ActionDefinition } from "@wirework/schema";
import { appPathSchema } from "@wirework/widget-contracts";

/** The host's router, as much of it as an action needs. */
export interface Navigator {
  /** Go to a path of the application, e.g. "/demo/runs". */
  go(to: string): void;
}

export function createNavActions(navigator: Navigator): ActionDefinition[] {
  return [
    {
      name: "nav/go",
      description: 'Open another page: with { to: "/demo/runs" }',
      handler: ({ args }) => {
        const to = appPathSchema.safeParse(args["to"]);
        if (!to.success) throw new Error('nav/go needs with: { to: "/a/path" }');
        navigator.go(to.data);
      },
    },
    {
      name: "nav/follow",
      description: "Open the address the event carries (a table's link-clicked)",
      params: z.object({}).strict(),
      handler: ({ event }) => {
        const href = appPathSchema.safeParse(getPath(event.payload, "href"));
        if (!href.success) throw new Error(`nav/follow: the event "${event.name}" carries no address of the application`);
        navigator.go(href.data);
      },
    },
  ];
}
