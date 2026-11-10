/**
 * ALL antd-descriptions logic lives here (guidelines: render-only
 * components): one antd item per field, its definition the TABLE's cell
 * (DescriptionField — the same kinds, the same host renderers) over the
 * record's property, and the click decided as a table row decides it: a
 * plain click on a link cell is the `link-clicked` intent, anything else is
 * the content's own business.
 */
import { createElement, useCallback, useMemo, type MouseEvent } from "react";
import type { DescriptionsProps } from "antd";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { DescriptionItem, DescriptionRecord } from "@wirework/widget-contracts";
import type { DescriptionsEvents } from "../widgets/antd-descriptions";
import { DescriptionField } from "../widgets/description-field";
import type { TableCellRenderers } from "./use-table-cell";
import { clicked, NO_CELLS } from "./use-table-rows";

const NO_RECORD: DescriptionRecord = {};

export function useDescriptions(
  store: ReadableStore,
  emit: Emit<DescriptionsEvents>,
  paths: { record: string; loading?: string | undefined },
  ports: { record: PortDefinition<DescriptionRecord>; loading: PortDefinition<boolean> },
  items: readonly DescriptionItem[],
  cells: TableCellRenderers = NO_CELLS,
) {
  // Validated by the contract's ports: a malformed value shows empty fields, never a crash.
  const record = usePort(store, paths.record, ports.record) ?? NO_RECORD;
  const loading = usePort(store, paths.loading, ports.loading) === true;

  const antdItems = useMemo<NonNullable<DescriptionsProps["items"]>>(
    () =>
      items.map((item, index) => ({
        key: `${index}:${item.property}`,
        label: item.title,
        children: createElement(DescriptionField, { item, record, cells }),
      })),
    [items, record, cells],
  );

  const click = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const target = clicked(event);
      if (target.on !== "link" || !target.follow) return;
      event.preventDefault();
      emit("link-clicked", { href: target.href, property: target.property, record });
    },
    [emit, record],
  );

  return { items: antdItems, loading, click };
}
