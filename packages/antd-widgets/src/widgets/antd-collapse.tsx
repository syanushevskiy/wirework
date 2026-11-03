/**
 * Collapse — the antd implementation of the `collapse` contract: antd
 * Collapse, a layout per panel rendered by the adapter when the panel is
 * first unfolded and kept after. Render-only: logic in useLayoutItems and
 * useCollapse.
 */
import { Collapse } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { collapseContract } from "@wirework/widget-contracts";
import { useCollapse } from "../hooks/use-collapse";

function AntdCollapse({ viewModel }: ContractProps<typeof collapseContract>) {
  const { items, open } = useCollapse(viewModel.panels);
  return (
    <div data-testid="antd-collapse">
      <Collapse items={items} defaultActiveKey={open} />
    </div>
  );
}

export const antdCollapse = implementContract(collapseContract, { type: "antd-collapse", component: AntdCollapse });
