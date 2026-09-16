/**
 * Widget form fields — ONLY presentation (logic in use-widget-form). Shared
 * by the builder ("Add widget") and the editor ("Edit widget"): input
 * ports, primitive settings and per-event reactions (required for events
 * that carry state).
 */
import { Checkbox, Flex, Form, Input, Select, Typography } from "antd";
import { PathCombobox } from "./path-combobox";

/** Select value standing for "the whole payload" (an option cannot be ""). */
const WHOLE_PAYLOAD = "$payload";
/** Select value standing for "use the widget's default" (an option cannot be ""). */
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
          <Form.Item
            key={field.name}
            htmlFor={fieldId}
            label={
              <>
                input: {field.name}
                {field.required ? " *" : ""}
                {field.description ? (
                  <Typography.Text type="secondary">&nbsp;— {field.description}</Typography.Text>
                ) : null}
                {field.defaultValue !== undefined ? (
                  <Typography.Text type="secondary">
                    &nbsp;(empty path shows {JSON.stringify(field.defaultValue)})
                  </Typography.Text>
                ) : null}
              </>
            }
          >
            {/* Inputs read EXISTING data: autocomplete offers current
                store paths compatible with the port's declared type. */}
            <PathCombobox
              id={fieldId}
              testId={fieldId}
              value={field.value}
              suggestions={() => suggestionsFor(field)}
              onSelect={(path) => setPortPath(field.name, path)}
            />
          </Form.Item>
        );
      })}

      {settings.length > 0 ? (
        <Flex vertical gap="small" data-testid="widget-settings">
          <Typography.Text strong>Settings</Typography.Text>
          {settings.map((setting) => {
            const fieldId = `setting-${setting.name}`;
            return (
              <Form.Item
                key={setting.name}
                htmlFor={fieldId}
                label={
                  <>
                    {setting.name}
                    {setting.required ? " *" : ""}
                    {setting.description ? (
                      <Typography.Text type="secondary">&nbsp;— {setting.description}</Typography.Text>
                    ) : null}
                  </>
                }
              >
                {setting.kind === "boolean" ? (
                  <Checkbox
                    id={fieldId}
                    data-testid={fieldId}
                    checked={setting.value === true}
                    onChange={(event) => setSetting(setting.name, event.target.checked)}
                  />
                ) : setting.kind === "select" ? (
                  <Select
                    id={fieldId}
                    data-testid={fieldId}
                    className="pg-field"
                    placeholder="choose…"
                    value={
                      typeof setting.value === "string" && setting.value !== ""
                        ? setting.value
                        : setting.defaultValue === undefined
                          ? undefined
                          : USE_DEFAULT
                    }
                    onChange={(value: string) =>
                      setSetting(setting.name, value === USE_DEFAULT ? "" : value)
                    }
                    options={[
                      ...(setting.defaultValue === undefined
                        ? []
                        : [{ value: USE_DEFAULT, label: `default: ${String(setting.defaultValue)}` }]),
                      ...(setting.options ?? []).map((option) => ({ value: option, label: option })),
                    ]}
                  />
                ) : (
                  <Input
                    id={fieldId}
                    data-testid={fieldId}
                    type={setting.kind === "number" ? "number" : "text"}
                    className="pg-field"
                    placeholder={
                      setting.defaultValue === undefined
                        ? undefined
                        : `default: ${String(setting.defaultValue)}`
                    }
                    value={typeof setting.value === "string" ? setting.value : ""}
                    onChange={(event) => setSetting(setting.name, event.target.value)}
                  />
                )}
              </Form.Item>
            );
          })}
        </Flex>
      ) : null}

      <Flex vertical gap="small">
        <Typography.Text strong>Emits</Typography.Text>
        {events.length === 0 ? (
          <Typography.Text type="secondary" data-testid="widget-events-empty">
            This widget emits no events.
          </Typography.Text>
        ) : (
          <Flex vertical gap="middle" data-testid="widget-events" component="ul">
            {events.map((event) => (
              <Flex
                vertical
                gap="small"
                component="li"
                key={event.name}
                data-testid="widget-event"
                data-event={event.name}
              >
                <div>
                  <Typography.Text code>{event.name}</Typography.Text>
                  {event.required ? " *" : ""}
                  {event.description ? (
                    <Typography.Text type="secondary">&nbsp;— {event.description}</Typography.Text>
                  ) : null}
                </div>
                {/* Reaction: a user-level subscription saved in the view model;
                    mandatory when the event carries state (required).
                    Two verbs: set a store path, or call a host action. */}
                <div className="pg-reaction">
                  <label htmlFor={`reaction-${event.name}-kind`}>
                    on {event.name}:{event.required ? " *" : ""}
                  </label>
                  <Select
                    id={`reaction-${event.name}-kind`}
                    data-testid={`reaction-${event.name}-kind`}
                    className="pg-field-narrow"
                    value={event.kind}
                    onChange={(value: string) => setReaction(event.name, "kind", value)}
                    options={[
                      { value: "set", label: "set store path" },
                      { value: "call", label: "call action", disabled: event.actions.length === 0 },
                    ]}
                  />
                  {event.kind === "call" ? (
                    <Select
                      id={`reaction-${event.name}-call`}
                      data-testid={`reaction-${event.name}-call`}
                      className="pg-field"
                      placeholder="choose an action…"
                      value={event.call === "" ? undefined : event.call}
                      onChange={(value: string) => setReaction(event.name, "call", value)}
                      options={event.actions.map((action) => ({
                        value: action.name,
                        label: action.description ? `${action.name} — ${action.description}` : action.name,
                      }))}
                    />
                  ) : (
                    <>
                      <Input
                        id={`reaction-${event.name}-set`}
                        data-testid={`reaction-${event.name}-set`}
                        className="pg-field-narrow pg-mono"
                        placeholder="store.path"
                        value={event.set}
                        onChange={(change) => setReaction(event.name, "set", change.target.value)}
                      />
                      <label htmlFor={`reaction-${event.name}-from`}>from payload</label>
                      {event.fields ? (
                        <Select
                          id={`reaction-${event.name}-from`}
                          data-testid={`reaction-${event.name}-from`}
                          className="pg-field-narrow pg-mono"
                          value={event.from === "" ? WHOLE_PAYLOAD : event.from}
                          onChange={(value: string) =>
                            setReaction(event.name, "from", value === WHOLE_PAYLOAD ? "" : value)
                          }
                          options={[
                            ...event.fields.map((field) => ({ value: field, label: field })),
                            { value: WHOLE_PAYLOAD, label: "whole payload" },
                          ]}
                        />
                      ) : (
                        <Input
                          id={`reaction-${event.name}-from`}
                          data-testid={`reaction-${event.name}-from`}
                          className="pg-field-narrow pg-mono"
                          placeholder="field (optional)"
                          value={event.from}
                          onChange={(change) => setReaction(event.name, "from", change.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </>
  );
}
