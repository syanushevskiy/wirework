/** ALL antd-collapse logic lives here (guidelines: render-only components): the panels as items, and which start unfolded. */
import { useMemo } from "react";
import type { LayoutItem } from "@wirework/widget-contracts";
import { useLayoutItems } from "./use-layout-items";

export function useCollapse(panels: readonly (LayoutItem & { open?: boolean | undefined })[]) {
  const items = useLayoutItems("panels", panels);
  const open = useMemo(() => panels.flatMap((panel) => (panel.open === true ? [panel.key] : [])), [panels]);
  return { items, open };
}
