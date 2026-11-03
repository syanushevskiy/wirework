/**
 * Tabs — the antd implementation of the `tabs` contract: antd Tabs, a
 * layout per tab rendered by the adapter when the tab is first shown and
 * kept after (antd mounts panes lazily and keeps them). Render-only: logic
 * in useLayoutItems.
 */
import { Tabs } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { tabsContract } from "@wirework/widget-contracts";
import { useLayoutItems } from "../hooks/use-layout-items";

function AntdTabs({ viewModel }: ContractProps<typeof tabsContract>) {
  const items = useLayoutItems("tabs", viewModel.tabs);
  return (
    <div data-testid="antd-tabs">
      <Tabs items={items} />
    </div>
  );
}

export const antdTabs = implementContract(tabsContract, { type: "antd-tabs", component: AntdTabs });
