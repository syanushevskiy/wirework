/**
 * ALL antd-timeline logic lives here (guidelines: render-only components):
 * the entries at the port as antd's items — the time as the item's title
 * beside the line, the text (under its heading) as the content, the tone
 * as antd's colour — plus the open last entry `pending` adds.
 */
import { createElement, useMemo } from "react";
import type { TimelineProps } from "antd";
import type { PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { TagTone, TimelineItem, TimelineMode } from "@wirework/widget-contracts";
import { TimelineEntry } from "../widgets/timeline-entry";

/** antd's line colours for the contract's semantic tones. */
const TIMELINE_COLOR = {
  default: "gray",
  info: "blue",
  success: "green",
  warning: "orange",
  danger: "red",
} as const satisfies Record<TagTone, string>;

/** antd's names for the contract's sides (it reads left and right as deprecated). */
const TIMELINE_MODE = {
  left: "start",
  right: "end",
  alternate: "alternate",
} as const satisfies Record<TimelineMode, NonNullable<TimelineProps["mode"]>>;

const NO_ITEMS: TimelineItem[] = [];

export function useTimeline(
  store: ReadableStore,
  path: string,
  port: PortDefinition<TimelineItem[]>,
  pending: string | undefined,
  mode: TimelineMode,
) {
  // Validated by the contract's port: a malformed value shows no entries, never a crash.
  const entries = usePort(store, path, port) ?? NO_ITEMS;
  const items = useMemo<NonNullable<TimelineProps["items"]>>(
    () => [
      ...entries.map((entry, index) => ({
        key: index,
        color: TIMELINE_COLOR[entry.tone ?? "default"],
        ...(entry.time === undefined ? {} : { title: entry.time }),
        content: createElement(TimelineEntry, { entry }),
      })),
      ...(pending === undefined ? [] : [{ key: "pending", loading: true, content: pending }]),
    ],
    [entries, pending],
  );
  return { items, count: entries.length, mode: TIMELINE_MODE[mode] };
}
