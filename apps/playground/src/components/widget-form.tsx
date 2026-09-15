/**
 * Widget form fields — ONLY presentation (logic in use-widget-form). Shared
 * by the builder ("Add widget") and the editor ("Edit widget"): input
 * ports, primitive settings and per-event reactions (required for events
 * that carry state).
 */
import { PathCombobox } from "./path-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Select item value standing for "the whole payload" (items cannot be ""). */
const WHOLE_PAYLOAD = "$payload";
/** Select item value standing for "use the widget's default" (items cannot be ""). */
const USE_DEFAULT = "$default";
import type { WidgetFormState } from "../hooks/use-widget-form";

export function WidgetForm({ form }: { form: WidgetFormState }) {
  const { definition, fields, settings, events, setPortPath, setSetting, setReaction, suggestionsFor } = form;
  if (!definition) return null;

  return (
    <>
      {fields.map((field) => {
        const fieldId = `port-input-${field.name}`;
        return (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={fieldId}>
              input: {field.name}
              {field.required ? " *" : ""}
              {field.description ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  — {field.description}
                </span>
              ) : null}
              {field.defaultValue !== undefined ? (
                <span className="ml-1 font-normal text-muted-foreground">
                  (empty path shows {JSON.stringify(field.defaultValue)})
                </span>
              ) : null}
            </Label>
            {/* Inputs read EXISTING data: autocomplete offers current
                store paths compatible with the port's declared type. */}
            <PathCombobox
              id={fieldId}
              testId={fieldId}
              value={field.value}
              suggestions={() => suggestionsFor(field)}
              onSelect={(path) => setPortPath(field.name, path)}
            />
          </div>
        );
      })}

      {settings.length > 0 ? (
        <div className="grid gap-3" data-testid="widget-settings">
          <Label>Settings</Label>
          {settings.map((setting) => {
            const fieldId = `setting-${setting.name}`;
            return (
              <div key={setting.name} className="grid gap-2 pl-4">
                <Label htmlFor={fieldId}>
                  {setting.name}
                  {setting.required ? " *" : ""}
                  {setting.description ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      — {setting.description}
                    </span>
                  ) : null}
                </Label>
                {setting.kind === "boolean" ? (
                  <Checkbox
                    id={fieldId}
                    data-testid={fieldId}
                    checked={setting.value === true}
                    onCheckedChange={(checked) => setSetting(setting.name, checked === true)}
                  />
                ) : setting.kind === "select" ? (
                  <Select
                    value={
                      typeof setting.value === "string" && setting.value !== ""
                        ? setting.value
                        : setting.defaultValue === undefined
                          ? undefined
                          : USE_DEFAULT
                    }
                    onValueChange={(value) =>
                      setSetting(setting.name, value === USE_DEFAULT ? "" : value)
                    }
                  >
                    <SelectTrigger id={fieldId} data-testid={fieldId} className="w-64">
                      <SelectValue placeholder="choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {setting.defaultValue !== undefined ? (
                        <SelectItem value={USE_DEFAULT}>default: {String(setting.defaultValue)}</SelectItem>
                      ) : null}
                      {(setting.options ?? []).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={fieldId}
                    data-testid={fieldId}
                    type={setting.kind === "number" ? "number" : "text"}
                    className="w-64"
                    placeholder={
                      setting.defaultValue === undefined
                        ? undefined
                        : `default: ${String(setting.defaultValue)}`
                    }
                    value={typeof setting.value === "string" ? setting.value : ""}
                    onChange={(event) => setSetting(setting.name, event.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label>Emits</Label>
        {events.length === 0 ? (
          <p data-testid="widget-events-empty" className="text-sm text-muted-foreground">
            This widget emits no events.
          </p>
        ) : (
          <ul data-testid="widget-events" className="grid gap-3 text-sm">
            {events.map((event) => (
              <li
                key={event.name}
                data-testid="widget-event"
                data-event={event.name}
                className="grid gap-2"
              >
                <div>
                  <code className="font-mono text-xs">{event.name}</code>
                  {event.required ? " *" : ""}
                  {event.description ? (
                    <span className="ml-1 text-muted-foreground">— {event.description}</span>
                  ) : null}
                </div>
                {/* Reaction: a user-level subscription saved in the view model;
                    mandatory when the event carries state (required).
                    Two verbs: set a store path, or call a host action. */}
                <div className="flex flex-wrap items-center gap-2 pl-4">
                  <Label htmlFor={`reaction-${event.name}-kind`}>
                    on {event.name}:{event.required ? " *" : ""}
                  </Label>
                  <Select
                    value={event.kind}
                    onValueChange={(value) => setReaction(event.name, "kind", value)}
                  >
                    <SelectTrigger
                      id={`reaction-${event.name}-kind`}
                      data-testid={`reaction-${event.name}-kind`}
                      className="w-36"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set">set store path</SelectItem>
                      <SelectItem value="call" disabled={event.actions.length === 0}>
                        call action
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {event.kind === "call" ? (
                    <Select
                      value={event.call === "" ? undefined : event.call}
                      onValueChange={(value) => setReaction(event.name, "call", value)}
                    >
                      <SelectTrigger
                        id={`reaction-${event.name}-call`}
                        data-testid={`reaction-${event.name}-call`}
                        className="w-56"
                      >
                        <SelectValue placeholder="choose an action…" />
                      </SelectTrigger>
                      <SelectContent>
                        {event.actions.map((action) => (
                          <SelectItem key={action.name} value={action.name}>
                            {action.name}
                            {action.description ? (
                              <span className="ml-1 text-muted-foreground">— {action.description}</span>
                            ) : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                  <Input
                    id={`reaction-${event.name}-set`}
                    data-testid={`reaction-${event.name}-set`}
                    className="w-48 font-mono"
                    placeholder="store.path"
                    value={event.set}
                    onChange={(change) => setReaction(event.name, "set", change.target.value)}
                  />
                  <Label htmlFor={`reaction-${event.name}-from`}>from payload</Label>
                  {event.fields ? (
                    <Select
                      value={event.from === "" ? WHOLE_PAYLOAD : event.from}
                      onValueChange={(value) =>
                        setReaction(event.name, "from", value === WHOLE_PAYLOAD ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id={`reaction-${event.name}-from`}
                        data-testid={`reaction-${event.name}-from`}
                        className="w-40 font-mono"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {event.fields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                        <SelectItem value={WHOLE_PAYLOAD}>whole payload</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`reaction-${event.name}-from`}
                      data-testid={`reaction-${event.name}-from`}
                      className="w-36 font-mono"
                      placeholder="field (optional)"
                      value={event.from}
                      onChange={(change) => setReaction(event.name, "from", change.target.value)}
                    />
                  )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
