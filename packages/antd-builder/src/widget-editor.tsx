/**
 * Widget editor — ONLY presentation (logic in use-widget-editor). The
 * shared widget form prefilled from a placed cell, in a panel the host
 * places above the page (it opens from the cell's edit-mode chrome): the
 * page and its toolbar stay visible and reachable — nothing floats over
 * them. "Save widget" reports the collected bindings + settings and the
 * host records them in the page session.
 */
import { Button, Card, Flex, Form, Typography } from "antd";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, PredicateRegistry } from "@wirework/engine";
import { useWidgetEditor, type EditableCell, type WidgetSettings } from "@wirework/builder";
import { WidgetForm } from "./widget-form";

export interface WidgetEditorProps {
  cell: EditableCell;
  store: Store;
  actions: ActionRegistry;
  /** The checks a condition may pick; the standard ones alone when absent. */
  predicates?: PredicateRegistry | undefined;
  /** Editing a user's own view: settings only, inputs, reactions and conditions read-only. */
  bindingsLocked: boolean;
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void;
  onCancel: () => void;
}

export function WidgetEditor({
  cell,
  store,
  actions,
  predicates,
  bindingsLocked,
  onSave,
  onCancel,
}: WidgetEditorProps) {
  const { form, canSave, save } = useWidgetEditor({ cell, store, actions, predicates, onSave });

  return (
    <Card
      size="small"
      className="ww-builder"
      data-testid="widget-editor"
      data-cell={cell.key}
      title={
        <>
          Edit cell <Typography.Text code>{cell.key}</Typography.Text>
        </>
      }
    >
      <Typography.Paragraph type="secondary">
        {cell.widget} — changes join the page edit session; save the page to keep them.
      </Typography.Paragraph>
      <Form layout="vertical" component="div" size="small">
        <Flex vertical gap="middle">
          <WidgetForm form={form} bindingsLocked={bindingsLocked} />
          <Flex gap="small" justify="end">
            <Button data-testid="widget-cancel" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="primary" data-testid="widget-save" disabled={!canSave} onClick={save}>
              Save widget
            </Button>
          </Flex>
        </Flex>
      </Form>
    </Card>
  );
}
