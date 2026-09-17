/**
 * Widget editor — ONLY presentation (logic in use-widget-editor). The
 * shared widget form prefilled from a placed cell, in a MASKLESS drawer
 * opened from the cell's edit-mode chrome, so the page stays visible and
 * interactive; "Save widget" reports the collected bindings + settings and
 * the host records them in the page session.
 */
import { Button, Drawer, Flex, Form, Typography } from "antd";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry } from "@wirework/engine";
import { WidgetForm } from "./widget-form";
import { useWidgetEditor, type EditableCell } from "../hooks/use-widget-editor";
import type { WidgetSettings } from "../hooks/use-widget-form";

export interface WidgetEditorProps {
  cell: EditableCell;
  store: Store;
  actions: ActionRegistry;
  /** Editing a user's own view: settings only, inputs and reactions read-only. */
  bindingsLocked: boolean;
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void;
  onCancel: () => void;
}

export function WidgetEditor({ cell, store, actions, bindingsLocked, onSave, onCancel }: WidgetEditorProps) {
  const { form, canSave, save } = useWidgetEditor(cell, store, actions, onSave);

  return (
    <Drawer
      open
      mask={false}
      placement="right"
      size={520}
      title={
        <>
          Edit cell <Typography.Text code>{cell.key}</Typography.Text>
        </>
      }
      onClose={onCancel}
      footer={
        <Flex gap="small" justify="end">
          <Button data-testid="widget-cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="primary" data-testid="widget-save" disabled={!canSave} onClick={save}>
            Save widget
          </Button>
        </Flex>
      }
    >
      <div data-testid="widget-editor" data-cell={cell.key}>
        <Typography.Paragraph type="secondary">
          {cell.widget} — changes join the page edit session; save the page to keep them.
        </Typography.Paragraph>
        <Form layout="vertical" component="div">
          <Flex vertical gap="middle">
            <WidgetForm form={form} bindingsLocked={bindingsLocked} />
          </Flex>
        </Form>
      </div>
    </Drawer>
  );
}
