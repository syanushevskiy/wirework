/**
 * ALL antd-list-position logic lives here (guidelines: render-only
 * components): where the list stands, as the store says it, the words for
 * it, and the scale. While the handle is dragged the position is a DRAFT —
 * the words follow it, the list does not — and letting go EMITS `changed`
 * once: a list that fetches the rows at a place is asked for one place, not
 * for every one the handle passed.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { listPage, listPages, listPercent } from "@wirework/widget-contracts";
import type { ListPositionEvents } from "../widgets/antd-list-position";

const count = new Intl.NumberFormat("en-US", { useGrouping: true });
/** 2000 as "2 000": a thin gap reads in every locale. */
const rows = (value: number): string => count.format(value).replaceAll(",", " ");

export function useListPosition(
  store: ReadableStore,
  emit: Emit<ListPositionEvents>,
  paths: { position: string; total: string; hasMore?: string | undefined; visible?: string | undefined },
  ports: {
    position: PortDefinition<number>;
    total: PortDefinition<number>;
    hasMore: PortDefinition<boolean>;
    visible: PortDefinition<number>;
  },
  /** Rows a page, for the widget shown as pages. */
  pageSize: number,
) {
  // Validated by the contract's ports; a malformed value shows the default.
  const total = usePort(store, paths.total, ports.total) ?? 0;
  /** The list goes on past `total`: its end is not known yet, and `total` is the rows known so far. */
  const open = usePort(store, paths.hasMore, ports.hasMore) === true && total > 0;
  const visible = Math.min(total, Math.max(1, usePort(store, paths.visible, ports.visible) ?? 1));
  /** The last position there is: the one that shows the end of the list (of the rows known, while it goes on). */
  const known = Math.max(0, total - visible);
  const stored = Math.min(known, usePort(store, paths.position, ports.position) ?? 0);

  // What the handle is dragged to, and the scale's length when the drag began: rows that become known meanwhile do
  // not pull the scale from under the handle. Undefined shows what the store says.
  const [draft, setDraft] = useState<{ position: number; last: number } | undefined>(undefined);
  const last = draft?.last ?? known;
  const position = Math.min(last, draft?.position ?? stored);
  const drag = useCallback(
    (next: number) => setDraft((held) => ({ position: next, last: held?.last ?? known })),
    [known],
  );

  // The widget only EMITS; the default reaction writes the position back.
  const release = useCallback(
    (next: number) => {
      setDraft(undefined);
      if (next !== stored) emit("changed", { position: next });
    },
    [stored, emit],
  );

  // AS PAGES: the page the list stands in, and a page chosen — its first row, or the last position there is when
  // that page is the list's short end. The same `changed` as the scale's.
  const pages = listPages(total, pageSize);
  const page = listPage(stored, visible, total, pageSize);
  // A list whose END IS NOT KNOWN has a page after the last one known: NEXT is never the end of it. Its rows are
  // not there yet, so the list is sent to the end of the rows known — where it asks for the next ones — and the
  // page's first row is AWAITED: once the rows known reach it, the list goes there. Not state: nothing shown
  // depends on it.
  const awaited = useRef<{ first: number; total: number } | undefined>(undefined);
  const goTo = useCallback(
    (next: number) => {
      const wanted = (Math.min(open ? pages + 1 : pages, Math.max(1, next)) - 1) * pageSize;
      awaited.current = wanted > known && open ? { first: wanted, total } : undefined;
      const first = Math.min(known, wanted);
      if (first !== stored) emit("changed", { position: first });
    },
    [known, open, pages, pageSize, stored, total, emit],
  );
  useEffect(() => {
    const wish = awaited.current;
    if (wish === undefined) return;
    if (wish.first <= known) {
      awaited.current = undefined;
      emit("changed", { position: wish.first });
      // The list ended before that page, or was scrolled back from the end it was sent to: nothing is awaited.
    } else if (!open || stored + 2 * visible < wish.total) {
      awaited.current = undefined;
    }
  }, [known, open, stored, visible, emit]);

  // A share of a whole nobody knows would be a guess: no percent until the end is found.
  const percent = open ? undefined : listPercent(position, visible, total);
  const range =
    total === 0
      ? "0 rows"
      : `${rows(position + 1)}–${rows(Math.min(total, position + visible))} of ${rows(total)}${open ? "+" : ""}`;
  /** Where a position is, in words: how far into the list, or — its end not known — which row of at least how many. */
  const placeOf = (value: number): string =>
    open ? `row ${rows(value + 1)} of at least ${rows(total)}` : `${listPercent(value, visible, total)}%`;

  return {
    position,
    total,
    open,
    visible,
    last,
    percent,
    range,
    /** What the scale's tooltip says for a position under the handle. */
    percentAt: (value: number | undefined): string => placeOf(value ?? 0),
    /** What a screen reader is told the handle stands at, while a percent would be a guess. */
    valueText: open ? (value: number): string => placeOf(value) : undefined,
    drag,
    release,
    page,
    pages,
    /** "Page 3 of 40" — "of 4+" while the list goes on past the rows known. */
    pageText: `Page ${rows(page)} of ${rows(pages)}${open ? "+" : ""}`,
    /** The rows the pagination spans: the list's — and one page more while it goes on, so that Next is offered. */
    pagedTotal: open ? (pages + 1) * pageSize : total,
    goTo,
  };
}
