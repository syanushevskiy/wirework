/**
 * Widget form fields — ONLY presentation (logic in use-widget-form). Shared
 * by the builder ("Add widget") and the editor ("Edit widget"): input
 * ports, primitive settings and per event its reactions — the write-back
 * it does by default, then the rows configured, added and removed here
 * (required for events that carry state and have no default). With
 * `bindingsLocked` (a user's own view), ports and reactions are shown
 * read-only: they belong to the shared page.
 */
import { Alert, Button, Checkbox, Flex, Form, Input, Select, Typography } from "antd";
import type { EventField, ReactionField, ReactionKind, WidgetFormState } from "@wirework/builder";
import { paramFieldId, portFieldId, reactionFieldId, settingFieldId } from "./ids";
import { PathCombobox } from "./path-combobox";

// The field ids are the form's promise to whoever automates it (ids.ts).
export { paramFieldId, portFieldId, reactionFieldId, settingFieldId };

export interface WidgetFormProps {
  form: WidgetFormState;
  /** Ports and reactions are read-only (the user overlay changes settings only). */
  bindingsLocked?: boolean;
}

interface ReactionRowProps {
  form: WidgetFormState;
  event: EventField;
  reaction: ReactionField;
  bindingsLocked: boolean;
}

/** One reaction of an event: its verb, its target, the chosen action's parameters, and Remove. */
function ReactionRow({ form, event, reaction, bindingsLocked }: ReactionRowProps) {
  const { setReaction, removeReaction, chooseFrom, setReactionParam, cycleParam } = form;
  const { name } = event;
  const { index } = reaction;
  const id = (part: string) => reactionFieldId(name, part, index);
  // The first row is what the event does (after its default, when it has
  // one); every row after it is what follows.
  const label = index === 0 && event.writesBack === undefined ? `on ${name}:${event.required ? " *" : ""}` : "then:";
  return (
    <Flex vertical gap="small" component="li" data-testid="widget-reaction" data-event={name} data-index={index}>
      <div className="ww-builder-reaction">
        <label htmlFor={id("kind")}>{label}</label>
        <Select
          id={id("kind")}
          data-testid={id("kind")}
          className="ww-builder-field-narrow"
          disabled={bindingsLocked}
          value={reaction.kind}
          onChange={(value: ReactionKind) => setReaction(name, index, "kind", value)}
          options={event.kindChoices}
        />
        {reaction.kind === "call" ? (
          <Select
            id={id("call")}
            data-testid={id("call")}
            className="ww-builder-field"
            placeholder="choose an action…"
            disabled={bindingsLocked}
            {...(reaction.callChoice === undefined ? {} : { value: reaction.callChoice })}
            onChange={(value: string) => setReaction(name, index, "call", value)}
            options={event.actionChoices}
          />
        ) : (
          <>
            <Input
              id={id("set")}
              data-testid={id("set")}
              className="ww-builder-field-narrow ww-builder-mono"
              placeholder="store.path"
              disabled={bindingsLocked}
              value={reaction.set}
              onChange={(change) => setReaction(name, index, "set", change.target.value)}
            />
            <label htmlFor={id("from")}>from payload</label>
            {event.fromChoices ? (
              <Select
                id={id("from")}
                data-testid={id("from")}
                className="ww-builder-field-narrow ww-builder-mono"
                disabled={bindingsLocked}
                value={reaction.fromChoice}
                onChange={(value: string) => chooseFrom(name, index, value)}
                options={event.fromChoices}
              />
            ) : (
              <Input
                id={id("from")}
                data-testid={id("from")}
                className="ww-builder-field-narrow ww-builder-mono"
                placeholder="field (optional)"
                disabled={bindingsLocked}
                value={reaction.from}
                onChange={(change) => setReaction(name, index, "from", change.target.value)}
              />
            )}
          </>
        )}
        <Button
          size="small"
          type="text"
          data-testid={id("remove")}
          aria-label={`Remove reaction ${index + 1} of ${name}`}
          disabled={bindingsLocked}
          onClick={() => removeReaction(name, index)}
        >
          ×
        </Button>
      </div>
      {/* What the chosen action asks for: one field per declared
          parameter (objects and lists as JSON), saved as `with`. */}
      {reaction.kind === "call" && reaction.params.length > 0 ? (
        <Flex vertical gap="small" className="ww-builder-params" data-testid={id("params")}>
          {reaction.params.map((param) => {
            const fieldId = paramFieldId(name, param.name, index);
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
                    onChange={() => cycleParam(name, index, param)}
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
                    onChange={(value: string | undefined) => setReactionParam(name, index, param.name, value ?? "")}
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
                    onChange={(change) => setReactionParam(name, index, param.name, change.target.value)}
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
                    onChange={(change) => setReactionParam(name, index, param.name, change.target.value)}
                  />
                )}
              </Form.Item>
            );
          })}
          {reaction.argumentsError ? (
            <Typography.Text type="danger" data-testid={id("params-error")}>
              {reaction.argumentsError}
            </Typography.Text>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  );
}

export function WidgetForm({ form, bindingsLocked = false }: WidgetFormProps) {
  const { definition, fields, settings, events, setPortPath, setSetting, chooseSetting, addReaction, suggestionsFor } =
    form;
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
                {/* Reactions: user-level subscriptions saved in the view model,
                    run in this order. A controlled widget's event writes its
                    port back by default — shown, never edited: it follows
                    the port's path. Two verbs per row: set a store path, or
                    call a host action. */}
                {event.writesBack ? (
                  <Typography.Text
                    type="secondary"
                    className="ww-builder-reaction"
                    data-testid={reactionFieldId(event.name, "default")}
                    data-path={event.writesBack.path}
                  >
                    on {event.name}: by default sets{" "}
                    {event.writesBack.path === "" ? (
                      <>
                        the path of input <Typography.Text code>{event.writesBack.port}</Typography.Text> (bind it
                        above)
                      </>
                    ) : (
                      <Typography.Text code>{event.writesBack.path}</Typography.Text>
                    )}{" "}
                    from payload <Typography.Text code>{event.writesBack.from ?? "whole payload"}</Typography.Text>
                  </Typography.Text>
                ) : null}
                {event.reactions.length > 0 ? (
                  <Flex vertical gap="small" component="ul" className="ww-builder-reactions">
                    {event.reactions.map((reaction) => (
                      <ReactionRow
                        key={reaction.index}
                        form={form}
                        event={event}
                        reaction={reaction}
                        bindingsLocked={bindingsLocked}
                      />
                    ))}
                  </Flex>
                ) : null}
                <div>
                  <Button
                    size="small"
                    data-testid={reactionFieldId(event.name, "add")}
                    disabled={bindingsLocked}
                    onClick={() => addReaction(event.name)}
                  >
                    {event.reactions.length > 0 || event.writesBack ? "+ then also…" : "+ reaction"}
                  </Button>
                </div>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </>
  );
}
