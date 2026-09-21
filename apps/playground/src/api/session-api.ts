/**
 * Fake SESSION request of the demo application: who the user is, what they
 * may do, and the lists every page needs. One simulated round trip when the
 * application starts — so the global state, like everything else, reaches
 * the store through a visible step.
 */
import { sampleSession, type Permissions } from "@wirework/view-data-models-examples";
import type { ChoiceOption } from "@wirework/widget-contracts";
import { applicationOptions } from "./suites-catalog";

export interface Session {
  user: { name: string; role: string };
  permissions: Permissions;
  lists: { applications: ChoiceOption[] };
}

export interface SessionApi {
  fetchSession(): Promise<Session>;
}

export function createSessionApi(options: { latencyMs: number }): SessionApi {
  return {
    fetchSession: () =>
      new Promise((resolve) => {
        setTimeout(
          () => resolve({ ...sampleSession, lists: { applications: applicationOptions() } }),
          options.latencyMs,
        );
      }),
  };
}
