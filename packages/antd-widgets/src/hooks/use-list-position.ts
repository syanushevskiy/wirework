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
  paths: { position: string; total: string; visible?: string | undefined },
  ports: { position: PortDefinition<number>; total: PortDefinition<number>; visible: PortDefinition<number> },
) {
  // Validated by the contract's ports; a malformed value shows the default.
  const total = usePort(store, paths.total, ports.total) ?? 0;
  const visible = Math.min(total, Math.max(1, usePort(store, paths.visible, ports.visible) ?? 1));
  /** The last position there is: the one that shows the end of the list. */
  const last = Math.max(0, total - visible);
  const stored = Math.min(last, usePort(store, paths.position, ports.position) ?? 0);

  // What the handle is dragged to; undefined shows what the store says.
  const [draft, setDraft] = useState<number | undefined>(undefined);
  const position = Math.min(last, draft ?? stored);

  // The widget only EMITS; the default reaction writes the position back.
  const release = useCallback(
    (next: number) => {
      setDraft(undefined);
      if (next !== stored) emit("changed", { position: next });
    },
    [stored, emit],
  );

  const percent = listPercent(position, visible, total);
  const range =
    total === 0 ? "0 rows" : `${rows(position + 1)}–${rows(Math.min(total, position + visible))} of ${rows(total)}`;

  return {
    position,
    total,
    visible,
    last,
    percent,
    range,
    /** What the scale's tooltip says for a position under the handle. */
    percentAt: (value: number | undefined): string => `${listPercent(value ?? 0, visible, total)}%`,
    drag: setDraft,
    release,
  };
}
