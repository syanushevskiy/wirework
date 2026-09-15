/**
 * Widget editor — ONLY presentation (logic in use-widget-editor). The shared
 * widget form prefilled from a placed cell, in a NON-MODAL dialog opened
 * from the cell's edit-mode chrome (the page stays interactive); "Save widget" reports the collected bindings +
 * settings and the host records them in the page session.
 */
import type { Store, WidgetBindings } from "@wirework/schema";
import type { ActionRegistry } from "@wirework/engine";
import { WidgetForm } from "./widget-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWidgetEditor, type EditableCell } from "../hooks/use-widget-editor";
import type { WidgetSettings } from "../hooks/use-widget-form";

export interface WidgetEditorProps {
  cell: EditableCell;
  store: Store;
  actions: ActionRegistry;
  onSave: (cell: EditableCell, bindings: WidgetBindings, settings: WidgetSettings) => void;
  onCancel: () => void;
}

export function WidgetEditor({ cell, store, actions, onSave, onCancel }: WidgetEditorProps) {
  const { form, canSave, save } = useWidgetEditor(cell, store, actions, onSave);

  return (
    // Non-modal: the page stays interactive (and visible) while a cell is edited.
    <Dialog open modal={false} onOpenChange={(open) => (open ? undefined : onCancel())}>
      <DialogContent
        data-testid="widget-editor"
        data-cell={cell.key}
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            Edit cell <code className="font-mono text-sm">{cell.key}</code>
          </DialogTitle>
          <DialogDescription>
            {cell.widget} — changes join the page edit session; save the page to keep them.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <WidgetForm form={form} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" data-testid="widget-cancel" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" data-testid="widget-save" disabled={!canSave} onClick={save}>
            Save widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
