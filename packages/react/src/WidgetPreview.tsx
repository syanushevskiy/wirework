/**
 * WidgetPreview — a live, NON-INTERACTIVE render of a widget definition in
 * an isolated sandbox, scaled into a fixed frame: what a palette or catalog
 * shows. A view model that fails
 * validation shows "no preview"; a widget that throws shows the error
 * boundary's placeholder — the catalog tells the truth.
 * Render-only: logic in useWidgetPreview.
 */
import type { ComponentType } from "react";
import type { AnyWidgetDefinition, WidgetPreviewSpec, WidgetProps } from "@wirework/schema";
import { useWidgetPreview } from "./useWidgetPreview";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

export interface WidgetPreviewProps extends WidgetPreviewSpec {
  definition: AnyWidgetDefinition;
  /** Frame size in px (the widget renders at 1/scale and is scaled down into it). */
  width?: number;
  height?: number;
  scale?: number;
}

export function WidgetPreview({ definition, seed, viewModel, width = 240, height = 110, scale = 0.7 }: WidgetPreviewProps) {
  const { parsed, emit, readable } = useWidgetPreview(definition, { seed, viewModel });
  const Widget = definition.component as ComponentType<WidgetProps>;
  return (
    <div
      className="ww-preview"
      data-testid="widget-preview"
      data-widget={definition.type}
      style={{ width, height }}
      inert
    >
      <div
        className="ww-preview-scale"
        style={{ transform: `scale(${scale})`, width: width / scale, height: height / scale }}
      >
        {parsed.problem !== undefined ? (
          <div className="ww-preview-empty" title={parsed.problem}>
            no preview
          </div>
        ) : (
          <WidgetErrorBoundary widgetType={definition.type}>
            <Widget viewModel={parsed.viewModel} store={readable} emit={emit} />
          </WidgetErrorBoundary>
        )}
      </div>
    </div>
  );
}
