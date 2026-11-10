/**
 * ALL antd-steps logic lives here (guidelines: render-only components): the
 * contract's steps as antd's items, the current one by position or key, a
 * failed current step as antd's error status, and a click as the `changed`
 * intent with the step's key.
 */
import { useCallback, useMemo } from "react";
import type { StepsProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { StepItem } from "@wirework/widget-contracts";
import type { StepsEvents } from "../widgets/antd-steps";

/**
 * What the antd Steps is given. Named, not inferred: a declaration file
 * must refer to antd's public `StepsProps`, never to the item type antd
 * keeps to itself.
 */
export interface StepsView {
  items: NonNullable<StepsProps["items"]>;
  /** The current step's position; -1 when the key names no step. */
  index: number;
  /** The current step's key; "" when none is current. */
  key: string;
  status: "process" | "error";
  change: (next: number) => void;
}

export function useSteps(
  store: ReadableStore,
  emit: Emit<StepsEvents>,
  paths: { current: string; failed?: string | undefined },
  ports: { current: PortDefinition<number | string>; failed: PortDefinition<boolean> },
  items: readonly StepItem[],
): StepsView {
  const current = usePort(store, paths.current, ports.current) ?? 0;
  const failed = usePort(store, paths.failed, ports.failed) === true;
  const index = typeof current === "number" ? current : items.findIndex((item) => item.key === current);
  const antdItems = useMemo<NonNullable<StepsProps["items"]>>(
    () =>
      items.map((item) => ({
        title: item.label,
        ...(item.description === undefined ? {} : { description: item.description }),
      })),
    [items],
  );
  // The widget only EMITS; the view model's reaction stores the key.
  const change = useCallback(
    (next: number) => emit("changed", { current: items[next]?.key ?? String(next) }),
    [emit, items],
  );
  return {
    items: antdItems,
    index,
    key: items[index]?.key ?? "",
    status: failed ? ("error" as const) : ("process" as const),
    change,
  };
}
