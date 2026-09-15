/**
 * ALL FlexLayoutView logic lives here (guidelines: render-only components).
 * Builds the library Model from the template's JSON (drag on only in edit
 * mode), renders cells through `factory`, places the edit-mode chrome in
 * each tab's header through `onRenderTab`, and reports the WHOLE model
 * document as the change payload after every action while editing.
 *
 * The Model instance is rebuilt only when the document's CONTENT changes:
 * the library's own change (a tab selection on mousedown) round-trips to
 * the same JSON, and rebuilding would replace the tab strip's DOM before
 * mouseup — the browser would then drop the click on a chrome button.
 */
import { createElement, useCallback, useMemo, type ReactNode } from "react";
import { Model, type IJsonModel, type ITabRenderValues, type TabNode } from "flexlayout-react";
import type { LayoutRendererProps } from "@wirework/react";
import type { FlexLayoutModelJson, FlexLayoutPage } from "./schema";

type Props = LayoutRendererProps<FlexLayoutPage, FlexLayoutModelJson>;

export function useFlexLayout({
  template,
  cellById,
  editable,
  onChange,
  renderCell,
  renderChrome,
}: Props) {
  const document = JSON.stringify(template.model);
  const model = useMemo(() => {
    const json = JSON.parse(document) as IJsonModel;
    return Model.fromJson({
      ...json,
      global: {
        ...(json.global ?? {}),
        tabEnableClose: false,
        tabEnableRename: false,
        tabSetEnableMaximize: false,
        tabEnableDrag: editable,
        tabSetEnableDrag: editable,
      },
    });
  }, [document, editable]);

  const factory = useCallback(
    (node: TabNode): ReactNode => {
      const cell = cellById(node.getId());
      return cell ? renderCell(cell) : null;
    },
    [cellById, renderCell],
  );

  const onRenderTab = useCallback(
    (node: TabNode, values: ITabRenderValues): void => {
      const cell = cellById(node.getId());
      if (cell && renderChrome) {
        values.buttons.push(
          createElement("span", { key: "ww-chrome", className: "ww-flexlayout-chrome" }, renderChrome(cell)),
        );
      }
    },
    [cellById, renderChrome],
  );

  const onModelChange = useCallback(
    (changed: Model): void => {
      if (editable) onChange?.(changed.toJson() as unknown as FlexLayoutModelJson);
    },
    [editable, onChange],
  );

  return { model, factory, onRenderTab, onModelChange };
}
