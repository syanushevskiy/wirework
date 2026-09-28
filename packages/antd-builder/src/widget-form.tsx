/**
 * Widget form fields — ONLY presentation (logic in use-widget-form). Shared
 * by the builder ("Add widget") and the editor ("Edit widget"): input
 * ports, primitive settings and per-event reactions (required for events
 * that carry state). With `bindingsLocked` (a user's own view), ports and
 * reactions are shown read-only: they belong to the shared page.
 */
import { Alert, Checkbox, Flex, Form, Input, Select, Typography } from "antd";
import type { ReactionKind, WidgetFormState } from "@wirework/builder";
import { paramFieldId, portFieldId, reactionFieldId, settingFieldId } from "./ids";
import { PathCombobox } from "./path-combobox";

// The field ids are the form's promise to whoever automates it (ids.ts).
export { paramFieldId, portFieldId, reactionFieldId, settingFieldId };

export interface WidgetFormProps {
  form: WidgetFormState;
  /** Ports and reactions are read-only (the user overlay changes settings only). */
  bindingsLocked?: boolean;
}

export function WidgetForm({ form, bindingsLocked = false }: WidgetFormProps) {
  const {
    definition,
    fields,
    settings,
    events,
    setPortPath,
    setSetting,
    chooseSetting,
    setReaction,
    chooseFrom,
    setReactionParam,
    cycleParam,
    suggestionsFor,
  } = form;
  if (!definition) return null;

  return (
    <>
      {bindingsLocked ? (
        <Alert
          type="info"
          showIcon
          data-testid="bindings-locked"
          title="Your view changes settings only. Inputs and reactions belong to the shared page — turn the user overlay off to change them."
        />
      ) : null}
      {fields.map((field) => {
        const fieldId = portFieldId(field.name);
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
            // A builder starts every port from a generated path; say so while it is untouched.
            extra={
              field.untouched ? (
                <span data-testid={`${fieldId}-suggested`}>
                  suggested path — keep it, change it, or pick existing data from the list
                </span>
              ) : undefined
            }
          >
            {/* Inputs read EXISTING data: autocomplete offers current
                store paths compatible with the port's declared type. */}
            <PathCombobox
              id={fieldId}
              testId={fieldId}
              disabled={bindingsLocked}
              value={field.value}
              suggested={field.suggested}
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
            const fieldId = settingFieldId(setting.name);
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
                    className="ww-builder-field"
                    placeholder="choose…"
                    {...(setting.choice === undefined ? {} : { value: setting.choice })}
                    onChange={(value: string) => chooseSetting(setting.name, value)}
                    options={setting.choices ?? []}
                  />
                ) : (
                  <Input
                    id={fieldId}
                    data-testid={fieldId}
                    type={setting.kind === "number" ? "number" : "text"}
                    className="ww-builder-field"
                    placeholder={
                      setting.defaultValue === undefined ? undefined : `default: ${String(setting.defaultValue)}`
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
                <div className="ww-builder-reaction">
                  <label htmlFor={reactionFieldId(event.name, "kind")}>
                    on {event.name}:{event.required ? " *" : ""}
                  </label>
                  <Select
                    id={reactionFieldId(event.name, "kind")}
                    data-testid={reactionFieldId(event.name, "kind")}
                    className="ww-builder-field-narrow"
                    disabled={bindingsLocked}
                    value={event.kind}
                    onChange={(value: ReactionKind) => setReaction(event.name, "kind", value)}
                    options={event.kindChoices}
                  />
                  {event.kind === "call" ? (
                    <Select
                      id={reactionFieldId(event.name, "call")}
                      data-testid={reactionFieldId(event.name, "call")}
                      className="ww-builder-field"
                      placeholder="choose an action…"
                      disabled={bindingsLocked}
                      {...(event.callChoice === undefined ? {} : { value: event.callChoice })}
                      onChange={(value: string) => setReaction(event.name, "call", value)}
                      options={event.actionChoices}
                    />
                  ) : (
                    <>
                      <Input
                        id={reactionFieldId(event.name, "set")}
                        data-testid={reactionFieldId(event.name, "set")}
                        className="ww-builder-field-narrow ww-builder-mono"
                        placeholder="store.path"
                        disabled={bindingsLocked}
                        value={event.set}
                        onChange={(change) => setReaction(event.name, "set", change.target.value)}
                      />
                      <label htmlFor={reactionFieldId(event.name, "from")}>from payload</label>
                      {event.fromChoices ? (
                        <Select
                          id={reactionFieldId(event.name, "from")}
                          data-testid={reactionFieldId(event.name, "from")}
                          className="ww-builder-field-narrow ww-builder-mono"
                          disabled={bindingsLocked}
                          value={event.fromChoice}
                          onChange={(value: string) => chooseFrom(event.name, value)}
                          options={event.fromChoices}
                        />
                      ) : (
                        <Input
                          id={reactionFieldId(event.name, "from")}
                          data-testid={reactionFieldId(event.name, "from")}
                          className="ww-builder-field-narrow ww-builder-mono"
                          placeholder="field (optional)"
                          disabled={bindingsLocked}
                          value={event.from}
                          onChange={(change) => setReaction(event.name, "from", change.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
                {/* What the chosen action asks for: one field per declared
                    parameter (objects and lists as JSON), saved as `with`. */}
                {event.kind === "call" && event.params.length > 0 ? (
                  <Flex
                    vertical
                    gap="small"
                    className="ww-builder-params"
                    data-testid={reactionFieldId(event.name, "params")}
                  >
                    {event.params.map((param) => {
                      const fieldId = paramFieldId(event.name, param.name);
                      return (
                        <Form.Item
                          key={param.name}
                          htmlFor={fieldId}
                          validateStatus={param.error ? "error" : ""}
                          help={param.error}
                          label={
                            <>
                              {param.name}
                              {param.required ? " *" : ""}
                              {param.description ? (
                                <Typography.Text type="secondary">&nbsp;— {param.description}</Typography.Text>
                              ) : null}
                            </>
                          }
                        >
                          {param.kind === "boolean" ? (
                            /* A yes/no the action may also be left to decide: the dash is
                               "not set". A click goes not set -> yes -> no -> not set (a
                               required or defaulted one only toggles). */
                            <Checkbox
                              id={fieldId}
                              data-testid={fieldId}
                              data-state={param.state}
                              disabled={bindingsLocked}
                              indeterminate={param.unset && !param.required}
                              checked={param.value === true}
                              onChange={() => cycleParam(event.name, param)}
                            >
                              <Typography.Text type="secondary">{param.stateLabel}</Typography.Text>
                            </Checkbox>
                          ) : param.kind === "select" ? (
                            <Select
                              id={fieldId}
                              data-testid={fieldId}
                              className="ww-builder-field"
                              placeholder="choose…"
                              allowClear
                              disabled={bindingsLocked}
                              {...(param.choice === undefined ? {} : { value: param.choice })}
                              onChange={(value: string | undefined) =>
                                setReactionParam(event.name, param.name, value ?? "")
                              }
                              options={param.choices ?? []}
                            />
                          ) : param.kind === "json" ? (
                            <Input.TextArea
                              id={fieldId}
                              data-testid={fieldId}
                              className="ww-builder-mono"
                              autoSize={{ minRows: 1, maxRows: 8 }}
                              placeholder="JSON (optional)"
                              disabled={bindingsLocked}
                              value={typeof param.value === "string" ? param.value : ""}
                              onChange={(change) => setReactionParam(event.name, param.name, change.target.value)}
                            />
                          ) : (
                            <Input
                              id={fieldId}
                              data-testid={fieldId}
                              type={param.kind === "number" ? "number" : "text"}
                              className="ww-builder-field"
                              placeholder={
                                param.defaultValue === undefined ? undefined : `default: ${String(param.defaultValue)}`
                              }
                              disabled={bindingsLocked}
                              value={typeof param.value === "string" ? param.value : ""}
                              onChange={(change) => setReactionParam(event.name, param.name, change.target.value)}
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                    {event.argumentsError ? (
                      <Typography.Text type="danger" data-testid={reactionFieldId(event.name, "params-error")}>
                        {event.argumentsError}
                      </Typography.Text>
                    ) : null}
                  </Flex>
                ) : null}
                {event.kept > 0 ? (
                  <Typography.Text type="secondary" data-testid={reactionFieldId(event.name, "kept")}>
                    then {event.kept} more reaction{event.kept === 1 ? "" : "s"}, kept as configured
                  </Typography.Text>
                ) : null}
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </>
  );
}
