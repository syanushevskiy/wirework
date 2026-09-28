/**
 * Widget builder panel — ONLY presentation (logic in use-widget-builder).
 * A palette of live previews (grouped by contract kind) on top of the
 * shared widget form; "Add" reports the collected bindings + settings. A
 * lock the host reports as a code is said here in words — the defaults
 * below, or the host's own.
 */
import { Button, Card, Flex, Form, Typography } from "antd";
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, ContractRegistry, WidgetRegistry } from "@wirework/engine";
import { useWidgetBuilder, type AddLock, type WidgetSettings } from "@wirework/builder";
import { WidgetForm } from "./widget-form";
import { WidgetPalette } from "./widget-palette";

export const DEFAULT_ADD_LOCK_TEXTS: Record<AddLock, string> = {
  permission: "You may not change pages.",
  editing: "Save or cancel the page edit to add widgets.",
  "user-view": "Adding a widget changes the shared page — turn the user overlay off to add one.",
};

export interface WidgetBuilderProps {
  registry: WidgetRegistry;
  contracts: ContractRegistry;
  store: Store;
  actions: ActionRegistry;
  /** The page widgets are added to — where the input ports' suggested paths start. */
  page: string;
  /** Why Add is not offered right now (an open page edit, a user's own view); undefined when it is. */
  addLock?: AddLock | undefined;
  /** The words for the lock codes; the defaults are English. */
  lockTexts?: Partial<Record<AddLock, string>> | undefined;
  onAdd: (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => void;
}

export function WidgetBuilder({
  registry,
  contracts,
  store,
  actions,
  page,
  addLock,
  lockTexts,
  onAdd,
}: WidgetBuilderProps) {
  const { widgetType, selectWidget, form, search, addDisabled, add } = useWidgetBuilder({
    registry,
    contracts,
    store,
    actions,
    page,
    onAdd,
    addLock,
  });
  const lockText = addLock === undefined ? undefined : (lockTexts?.[addLock] ?? DEFAULT_ADD_LOCK_TEXTS[addLock]);

  return (
    <Card size="small" className="ww-builder" data-testid="widget-builder">
      <Form layout="vertical" component="div" size="small">
        <Flex vertical gap="small">
          {/* Search, then "Add", then the catalog: the whole flow in one column. */}
          <WidgetPalette
            search={search}
            selected={widgetType}
            onSelect={selectWidget}
            action={
              <Button
                type="primary"
                size="small"
                data-testid="add-widget"
                disabled={addDisabled}
                {...(lockText === undefined ? {} : { title: lockText })}
                onClick={add}
              >
                Add widget
              </Button>
            }
          />
          {lockText !== undefined ? (
            <Typography.Text type="secondary" data-testid="add-widget-locked">
              {lockText}
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
