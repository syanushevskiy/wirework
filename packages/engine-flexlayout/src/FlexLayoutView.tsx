/**
 * FlexLayout renderer — a docking layout of tabsets; every cell is a tab.
 * The library owns the tree and the drag; we hand it the model, a cell
 * factory and the edit-mode chrome for tab headers. Render-only.
 */
import { Layout } from "flexlayout-react";
import type { LayoutRendererProps } from "@wirework/react";
import type { FlexLayoutModelJson, FlexLayoutPage } from "./schema";
import { useFlexLayout } from "./useFlexLayout";

export function FlexLayoutView(props: LayoutRendererProps<FlexLayoutPage, FlexLayoutModelJson>) {
  const { model, factory, onRenderTab, onModelChange } = useFlexLayout(props);
  return (
    <div className="ww-flexlayout" data-testid="flexlayout">
      <Layout
        model={model}
        factory={factory}
        onRenderTab={onRenderTab}
        onModelChange={onModelChange}
        realtimeResize
      />
    </div>
  );
}
