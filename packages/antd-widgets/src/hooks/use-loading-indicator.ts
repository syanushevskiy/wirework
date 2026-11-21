/**
 * WHEN a table shows that it is loading (the `loadingIndicator` setting of
 * both tables):
 *
 *  - `always` — whenever its `loading` port says so: the spinner lies over
 *    the rows on every fetch that replaces them.
 *  - `first` — only until the FIRST answer: from the moment the table
 *    appears until rows arrive (or the first load ends without any — an
 *    empty list, an error). Meanwhile the table is WAITING: it never says
 *    "No rows" of a list it has not been told about. Every later fetch — a
 *    filter, a sort, Reload — shows nothing: the rows held stay as they are
 *    until the new ones replace them.
 *
 * `first` needs the `loading` port BOUND: a table nobody tells when its
 * load ended would wait for ever, so without it the table never waits.
 */
import { useState } from "react";

export type LoadingIndicator = "always" | "first";

export interface LoadingIndicatorView {
  /** Whether the spinner shows. */
  spinning: boolean;
  /** `first` only: no answer came yet — nothing is said of the rows, not even that there are none. */
  waiting: boolean;
}

/**
 * What a table says where its rows would be: nothing while it waits for its
 * first answer — a no-break space, because antd reads an empty text as "use
 * your own".
 */
export const emptyTextOf = (indicator: LoadingIndicatorView, emptyText: string): string =>
  indicator.waiting ? " " : emptyText;

export function useLoadingIndicator(
  mode: LoadingIndicator,
  /** What the `loading` port says, and whether it is bound at all. */
  loading: boolean,
  bound: boolean,
  /** Whether rows were ever written at the rows path — an empty list counts. */
  received: boolean,
): LoadingIndicatorView {
  // State derived while rendering (react.dev, "You might not need an effect"): a load was seen to begin, and the
  // first answer was seen — rows, or the load's end.
  const [began, setBegan] = useState(false);
  const [answered, setAnswered] = useState(false);
  if (loading && !began) setBegan(true);
  if (!answered && (received || (began && !loading))) setAnswered(true);

  if (mode === "always") return { spinning: loading, waiting: false };
  const waiting = bound && !answered && !received;
  return { spinning: waiting, waiting };
}
