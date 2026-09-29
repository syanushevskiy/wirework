/**
 * What the demo's fake servers have been asked and what they have answered
 * — so a test can wait for "the server has had time to answer" as a FACT
 * (nothing in flight) instead of a sleep. Every fake request goes through
 * `tracked`; `requests()` is on the console as `wirework.requests()`.
 *
 * A test that wants to see the page BEFORE the answers (a loading label, an
 * empty table) holds them: `window.wireworkHoldAnswers = true` before the
 * application starts (Playwright's `addInitScript`) keeps every answer
 * back, and `wirework.releaseAnswers()` lets them through. Otherwise the
 * window between opening a page and its first answer is a few hundred
 * milliseconds — a race no assertion should run in.
 */
declare global {
  interface Window {
    wireworkHoldAnswers?: boolean;
  }
}

let pending = 0;
let answered = 0;

/** The gate every held answer waits behind, made when the first request finds the hold set. */
let gate: { opened: Promise<void>; open: () => void } | undefined;

function currentGate(): { opened: Promise<void> } | undefined {
  if (window.wireworkHoldAnswers !== true) return undefined;
  if (gate === undefined) {
    let open: () => void = () => undefined;
    const opened = new Promise<void>((resolve) => {
      open = resolve;
    });
    gate = { opened, open };
  }
  return gate;
}

export function tracked<T>(request: Promise<T>): Promise<T> {
  pending += 1;
  const held = currentGate();
  const delivered = held
    ? request.then(
        async (value) => {
          await held.opened;
          return value;
        },
        async (error: unknown) => {
          await held.opened;
          throw error;
        },
      )
    : request;
  return delivered.finally(() => {
    pending -= 1;
    answered += 1;
  });
}

/** Let every held answer through, and hold none from now on. */
export function releaseAnswers(): void {
  window.wireworkHoldAnswers = false;
  gate?.open();
  gate = undefined;
}

export interface RequestCounts {
  /** Requests the fake servers have not answered yet (a held answer counts as pending). */
  pending: number;
  /** Requests answered (or failed) since the application started. */
  answered: number;
}

export const requests = (): RequestCounts => ({ pending, answered });
