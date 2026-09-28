/**
 * ALL FlexLayoutView logic lives here (guidelines: render-only components).
 * Builds the library Model from the template's JSON, renders cells through
 * `factory`, places the edit-mode chrome in each tab's header through
 * `onRenderTab`, and reports the WHOLE model document as the change payload
 * after every action while editing.
 *
 * The Model instance is rebuilt only when the document's CONTENT changes:
 * the library's own change (a tab selection on mousedown) round-trips to
 * the same JSON, and rebuilding would replace the tab strip's DOM before
 * mouseup — the browser would then drop the click on a chrome button. Edit
 * mode (drag on or off) is an attribute update on the SAME model, so
 * toggling it keeps the tabs' DOM — and is never reported as a change.
 */
import { createElement, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Actions, Model, type Action, type IJsonModel, type ITabRenderValues, type TabNode } from "flexlayout-react";
import type { LayoutRendererProps } from "@wirework/react";
import type { FlexLayoutModelJson, FlexLayoutPage } from "./schema";

type Props = LayoutRendererProps<FlexLayoutPage, FlexLayoutModelJson>;

/** What the layout's global attributes say about editing. */
const editing = (editable: boolean) => ({ tabEnableDrag: editable, tabSetEnableDrag: editable });

export function useFlexLayout({ template, cellById, editable, onChange, renderCell, renderChrome }: Props) {
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
        ...editing(editable),
      },
    });
    // `editable` is read once at creation; the effect below keeps it current on the same model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document]);

  useEffect(() => {
    model.doAction(Actions.updateModelAttributes(editing(editable)));
  }, [model, editable]);

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
    (changed: Model, action: Action): void => {
      if (editable && action.type !== Actions.UPDATE_MODEL_ATTRIBUTES) {
        onChange?.(changed.toJson() as unknown as FlexLayoutModelJson);
      }
    },
    [editable, onChange],
  );

  return { model, factory, onRenderTab, onModelChange };
}
