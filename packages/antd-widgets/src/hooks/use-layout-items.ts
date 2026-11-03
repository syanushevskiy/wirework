/**
 * ALL antd-tabs and antd-collapse logic lives here (guidelines: render-only
 * components): the items of the contract as antd's items, each one's
 * content the layout it holds, rendered by the adapter at its own path in
 * the view model (`tabs.0.content`) so two layouts of one widget are told
 * apart in the overlay and on the bus.
 */
import { createElement, useMemo, type ReactNode } from "react";
import { NestedLayout } from "@wirework/react";
import type { LayoutItem } from "@wirework/widget-contracts";

export interface LayoutItemView {
  key: string;
  label: string;
  children: ReactNode;
}

export function useLayoutItems<T extends LayoutItem>(setting: string, items: readonly T[]): LayoutItemView[] {
  return useMemo(
    () =>
      items.map(({ key, label, content }, index) => ({
        key,
        label,
        children:
          content === undefined
            ? null
            : createElement(NestedLayout, { template: content, path: `${setting}.${index}.content` }),
      })),
    [setting, items],
  );
}
