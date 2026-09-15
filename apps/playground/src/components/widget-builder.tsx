/**
 * Widget builder panel — ONLY presentation (logic in use-widget-builder).
 * A widget-type select on top of the shared widget form; "Add" reports the
 * collected bindings + settings.
 */
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry, WidgetRegistry } from "@wirework/engine";
import { WidgetForm } from "./widget-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWidgetBuilder } from "../hooks/use-widget-builder";
import type { WidgetSettings } from "../hooks/use-widget-form";

export interface WidgetBuilderProps {
  registry: WidgetRegistry;
  store: Store;
  actions: ActionRegistry;
  onAdd: (widgetType: string, bindings: WidgetBindings, settings: WidgetSettings) => void;
}

export function WidgetBuilder({ registry, store, actions, onAdd }: WidgetBuilderProps) {
  const { widgetTypes, widgetType, selectWidget, form, canAdd, add } = useWidgetBuilder(
    registry,
    store,
    actions,
    onAdd,
  );

  return (
    <Card className="mb-4" data-testid="widget-builder">
      <CardHeader>
        <CardTitle>Add widget</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="widget-select">Widget</Label>
          <Select value={widgetType} onValueChange={selectWidget}>
            <SelectTrigger id="widget-select" data-testid="widget-select" className="w-64">
              <SelectValue placeholder="Choose a widget…" />
            </SelectTrigger>
            <SelectContent>
              {widgetTypes.map(({ type, description }) => (
                <SelectItem key={type} value={type}>
                  {type}
                  {description ? (
                    <span className="ml-1 text-muted-foreground">— {description}</span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <WidgetForm form={form} />

        <div>
          <Button type="button" data-testid="add-widget" disabled={!canAdd} onClick={add}>
            Add widget
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
