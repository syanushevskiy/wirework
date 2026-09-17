/**
 * Widget builder panel — ONLY presentation (logic in use-widget-builder).
 * A palette of live previews (grouped by contract kind) on top of the
 * shared widget form; "Add" reports the collected bindings + settings.
 */
import { Button, Card, Flex, Form, Typography } from "antd";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, ContractRegistry, WidgetRegistry } from "@wirework/engine";
import { WidgetForm } from "./widget-form";
import { WidgetPalette } from "./widget-palette";
import { useWidgetBuilder } from "../hooks/use-widget-builder";
import type { WidgetSettings } from "../hooks/use-widget-form";

export interface WidgetBuilderProps {
  registry: WidgetRegistry;
  contracts: ContractRegistry;
  store: Store;
  actions: ActionRegistry;
  /** A page edit session is open: adding would drop it, so Add waits for Save or Cancel. */
  addLocked: boolean;
  onAdd: (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => void;
}

export function WidgetBuilder({ registry, contracts, store, actions, addLocked, onAdd }: WidgetBuilderProps) {
  const { widgetGroups, widgetType, selectWidget, form, canAdd, add } = useWidgetBuilder(
    registry,
    contracts,
    store,
    actions,
    onAdd,
  );

  return (
    <Card size="small" className="pg-builder" data-testid="widget-builder">
      <Form layout="vertical" component="div" size="small">
        <Flex vertical gap="small">
          {/* Search, then "Add", then the catalog: the whole flow in one column. */}
          <WidgetPalette
            groups={widgetGroups}
            selected={widgetType}
            onSelect={selectWidget}
            action={
              <Button
                type="primary"
                size="small"
                data-testid="add-widget"
                disabled={!canAdd || addLocked}
                title={addLocked ? "Save or cancel the page edit first" : undefined}
                onClick={add}
              >
                Add widget
              </Button>
            }
          />
          {addLocked ? (
            <Typography.Text type="secondary" data-testid="add-widget-locked">
              Save or cancel the page edit to add widgets.
            </Typography.Text>
          ) : null}
          {widgetType !== "" ? (
            <Typography.Text data-testid="widget-selected">
              Selected: <Typography.Text code>{widgetType}</Typography.Text>
            </Typography.Text>
          ) : null}

          <WidgetForm form={form} />
        </Flex>
      </Form>
    </Card>
  );
}
