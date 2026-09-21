/**
 * Navigation as ACTIONS (doc/builder-user-needs.md, W16): a page never
 * touches the router. A reaction names `nav/go` and where to go; the HOST
 * owns the router and hands the actions a Navigator — the same factory
 * pattern as every other host service (doc/actions-design.md).
 */
import { z } from "zod";
import type { ActionDefinition } from "@wirework/schema";

/** The host's router, as much of it as an action needs. */
export interface Navigator {
  /** Go to a path of the application, e.g. "/demo/runs". */
  go(to: string): void;
}

const target = z.string().startsWith("/");

export function createNavActions(navigator: Navigator): ActionDefinition[] {
  return [
    {
      name: "nav/go",
      description: 'Open another page: with { to: "/demo/runs" }',
      handler: ({ args }) => {
        const to = target.safeParse(args["to"]);
        if (!to.success) throw new Error('nav/go needs with: { to: "/a/path" }');
        navigator.go(to.data);
      },
    },
  ];
}
