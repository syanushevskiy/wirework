/**
 * Fake SESSION request of the demo application: who the user is — with the
 * ROLES they hold, from the broadest to the most specific
 * (doc/roles-design.md) —, what they may do, and the lists every page
 * needs. One simulated round trip when the application starts, and one more
 * every time "Sign in as" picks another person — so the global state, like
 * everything else, reaches the store through a visible step. The API also
 * remembers WHO is signed in (`current`), the way a cookie would: the fake
 * servers read the session from there, never from the page's request.
 */
import {
  DEMO_ROLES,
  samplePeople,
  samplePermissions,
  type DemoRole,
  type Permissions,
  type SessionUser,
} from "@wirework/view-data-models-examples";
import type { ChoiceOption } from "@wirework/widget-contracts";
import { tracked } from "./requests";
import { applicationOptions } from "./suites-catalog";

export interface Session {
  user: SessionUser;
  permissions: Permissions;
  /** The lists every page needs — `roles`: every role the application grants, from the broadest to the most specific. */
  lists: { applications: ChoiceOption[]; roles: string[] };
}

export interface SessionApi {
  /** Sign in as one of the demo's people (the QA unless said otherwise) and answer their session. */
  fetchSession(person?: DemoRole): Promise<Session>;
  /** Whoever the last session request signed in — what the fake servers check. */
  current(): SessionUser;
}

export function createSessionApi(options: { latencyMs: number }): SessionApi {
  let signedIn: SessionUser = samplePeople.qa;
  return {
    fetchSession: (person = "qa") => {
      signedIn = samplePeople[person];
      return tracked(
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                user: signedIn,
                permissions: samplePermissions,
                lists: { applications: applicationOptions(), roles: [...DEMO_ROLES] },
              }),
            options.latencyMs,
          );
        }),
      );
    },
    current: () => signedIn,
  };
}
