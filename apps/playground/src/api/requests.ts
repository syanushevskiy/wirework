/**
 * What the demo's fake servers have been asked and what they have answered
 * — so a test can wait for "the server has had time to answer" as a FACT
 * (nothing in flight) instead of a sleep. Every fake request goes through
 * `tracked`; `requests()` is on the console as `wirework.requests()`.
 */
let pending = 0;
let answered = 0;

export function tracked<T>(request: Promise<T>): Promise<T> {
  pending += 1;
  return request.finally(() => {
    pending -= 1;
    answered += 1;
  });
}

export interface RequestCounts {
  /** Requests the fake servers have not answered yet. */
  pending: number;
  /** Requests answered (or failed) since the application started. */
  answered: number;
}

export const requests = (): RequestCounts => ({ pending, answered });
