/**
 * ALL antd-list-position logic lives here (guidelines: render-only
 * components): where the list stands, as the store says it, the words for
 * it, and the scale. While the handle is dragged the position is a DRAFT —
 * the words follow it, the list does not — and letting go EMITS `changed`
 * once: a list that fetches the rows at a place is asked for one place, not
 * for every one the handle passed.
 */
import { useCallback, useState } from "react";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { listPercent } from "@wirework/widget-contracts";
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
  };
}
