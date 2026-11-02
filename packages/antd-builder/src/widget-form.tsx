/**
 * Widget form fields — ONLY presentation (logic in use-widget-form). Shared
 * by the builder ("Add widget") and the editor ("Edit widget"): input
 * ports, primitive settings and per event its reactions — the write-back
 * it does by default, then the rows configured, added and removed here
 * (required for events that carry state and have no default), and the
 * CONDITION under which the widget shows — rows of path, check and value
 * that must all hold. With `bindingsLocked` (a user's own view), ports,
 * reactions and conditions are shown read-only: they belong to the shared
 * page.
 */
import { Fragment } from "react";
import { Alert, Button, Checkbox, ConfigProvider, Flex, Form, Input, Select, Typography } from "antd";
import type {
  Choice,
  ConditionField,
  EventField,
  GroupField,
  ReactionField,
  ReactionKind,
  TestDraft,
  TestFacts,
  TreeEdit,
  WidgetFormState,
} from "@wirework/builder";
import { conditionFieldId, paramFieldId, portFieldId, reactionFieldId, settingFieldId } from "./ids";
import { PathCombobox } from "./path-combobox";

// The field ids are the form's promise to whoever automates it (ids.ts).
export { conditionFieldId, paramFieldId, portFieldId, reactionFieldId, settingFieldId };

/** A negated condition reads "unless"; the dropdown says so. */
const NOT_CHOICES = [
  { value: "when", label: "when" },
  { value: "unless", label: "unless" },
];
const YES_NO = [
  { value: "true", label: "true" },
  { value: "false", label: "false" },
];

/**
 * The form's dropdowns open BESIDE their field, not on the document body:
 * a long form (a constructor with groups) scrolls, and a popup aligned
 * against the viewport flips and re-aligns under a scroll — a field near
 * the end of the page could not be picked from. Beside its field, a popup
 * scrolls with the form and extends it when there is no room below.
 */
const popupBeside = (trigger?: HTMLElement): HTMLElement => trigger?.parentElement ?? document.body;

/** The value field's placeholder, by the kind of value the check takes. */
const VALUE_HINT: Record<string, string> = { list: "a, b, c", json: "JSON", number: "a number" };

interface TestFieldsProps {
  /** The field ids of this test: the row's, or the constructor part's. */
  id: (part: string) => string;
  test: TestDraft & TestFacts;
  /** The checks on offer: with the constructor for a row, without it inside one. */
  checks: Choice[];
  paths: () => string[];
  locked: boolean;
  onChange: <K extends keyof TestDraft>(field: K, value: TestDraft[K]) => void;
}

/**
 * The fields of ONE test: when/unless, the path read, the check by its
 * phrase, the value it takes (a field of the kind the check declares).
 * Shared by a condition row and by every test inside a constructor.
 */
function TestFields({ id, test, checks, paths, locked, onChange }: TestFieldsProps) {
  return (
    <>
      <Select
        id={id("not")}
        data-testid={id("not")}
        className="ww-builder-field-narrow"
        disabled={locked}
        value={test.not ? "unless" : "when"}
        onChange={(choice: string) => onChange("not", choice === "unless")}
        options={NOT_CHOICES}
      />
      <PathCombobox
        id={id("path")}
        testId={id("path")}
        placeholder="store.path"
        disabled={locked}
        value={test.path}
        suggestions={paths}
        onSelect={(path) => onChange("path", path)}
      />
      <Select
        id={id("is")}
        data-testid={id("is")}
        className="ww-builder-field"
        placeholder="choose a check…"
        disabled={locked}
        {...(test.is === "" ? {} : { value: test.is })}
        onChange={(choice: string) => onChange("is", choice)}
        options={checks}
      />
      {test.toKind === "none" ? null : test.toKind === "select" || test.toKind === "boolean" ? (
        <Select
          id={id("to")}
          data-testid={id("to")}
          className="ww-builder-field-narrow"
          placeholder="choose…"
          disabled={locked}
          {...(test.to === "" ? {} : { value: test.to })}
          onChange={(choice: string) => onChange("to", choice)}
          options={test.toKind === "boolean" ? YES_NO : (test.toChoices ?? [])}
        />
      ) : (
        /* Text even for a number: the form reads it and says "not a number" —
           a number input would swallow the letters and say nothing. */
        <Input
          id={id("to")}
          data-testid={id("to")}
          className="ww-builder-field-narrow"
          placeholder={VALUE_HINT[test.toKind] ?? "value"}
          disabled={locked}
          value={test.to}
          onChange={(change) => onChange("to", change.target.value)}
        />
      )}
    </>
  );
}

interface ConstructorGroupProps {
  form: WidgetFormState;
  index: number;
  group: GroupField;
  locked: boolean;
}

/**
 * One group of the constructor, read left to right as the condition it
 * builds — `not ( a and b ) or ( c and d )`: a "not" button before it,
 * its parts in a row with the joiner between them (a button: press it and
 * the group's "and" becomes "or"), a nested group between "(" and ")", and
 * after the last part the joiner once more, which adds one more test, and
 * "( )", which adds a group inside. Every kind of element has its own
 * colour (styles.css): parentheses purple, joiners teal, "not" volcano,
 * a test on a white card. The root group has no parentheses and no Remove:
 * the row's × removes the whole constructor.
 */
function ConstructorGroup({ form, index, group, locked }: ConstructorGroupProps) {
  const { editConstructor, testChoices, conditionPaths } = form;
  const { at } = group;
  const nested = at !== "";
  const groupId = (part: string) => conditionFieldId(`group-${nested ? at : "root"}-${part}`, index);
  const edit = (step: TreeEdit) => editConstructor(index, at, step);
  return (
    <span
      className={nested ? "ww-builder-group ww-builder-group-nested" : "ww-builder-group"}
      data-testid="constructor-group"
      data-at={at}
    >
      <Button
        className="ww-builder-not"
        data-testid={groupId("not")}
        aria-pressed={group.not}
        title="the opposite of what follows"
        disabled={locked}
        onClick={() => edit({ group: { not: !group.not } })}
      >
        not
      </Button>
      {nested ? <span className="ww-builder-paren">(</span> : null}
      {group.parts.map((part, position) => (
        <Fragment key={part.at}>
          {position === 0 ? null : (
            <Button
              className="ww-builder-op"
              data-testid={groupId(position === 1 ? "join" : `join-${position}`)}
              title="press to switch between and / or"
              disabled={locked}
              onClick={() => edit({ group: { join: group.join === "and" ? "or" : "and" } })}
            >
              {group.join}
            </Button>
          )}
          {"parts" in part ? (
            <ConstructorGroup form={form} index={index} group={part} locked={locked} />
          ) : (
            <span className="ww-builder-reaction ww-builder-test" data-testid="constructor-test" data-at={part.at}>
              <TestFields
                id={(field) => conditionFieldId(`part-${part.at}-${field}`, index)}
                test={part}
                checks={testChoices}
                paths={conditionPaths}
                locked={locked}
                onChange={(field, value) => editConstructor(index, part.at, { set: { [field]: value } })}
              />
              <Button
                size="small"
                type="text"
                data-testid={conditionFieldId(`part-${part.at}-remove`, index)}
                aria-label={`Remove condition ${part.at}`}
                disabled={locked}
                onClick={() => editConstructor(index, part.at, "remove")}
              >
                ×
              </Button>
            </span>
          )}
        </Fragment>
      ))}
      <Button
        className="ww-builder-op ww-builder-op-add"
        data-testid={groupId("add-test")}
        aria-label={`Add a condition to group ${at || "root"}, joined by ${group.join}`}
        title={`one more condition, joined by ${group.join}`}
        disabled={locked}
        onClick={() => edit({ add: "test" })}
      >
        {group.join} …
      </Button>
      <Button
        className="ww-builder-paren-add"
        data-testid={groupId("add-group")}
        aria-label={`Add a group to group ${at || "root"}`}
        title="a group in parentheses"
        disabled={locked}
        onClick={() => edit({ add: "group" })}
      >
        ( … )
      </Button>
      {nested ? (
        <>
          <span className="ww-builder-paren">)</span>
          <Button
            size="small"
            type="text"
            data-testid={groupId("remove")}
            aria-label={`Remove group ${at}`}
            disabled={locked}
            onClick={() => edit("remove")}
          >
            ×
          </Button>
        </>
      ) : null}
    </span>
  );
}

interface ConditionRowProps {
  form: WidgetFormState;
  condition: ConditionField;
  bindingsLocked: boolean;
}

/**
 * One condition: a test's fields, or the constructor's tree, and Remove —
 * under it the row as a sentence, or why it does not hold together yet. A
 * member the form does not edit (an `any` written in the inspector, words
 * it cannot read) shows as it is.
 */
function ConditionRow({ form, condition, bindingsLocked }: ConditionRowProps) {
  const { setCondition, removeCondition, predicateChoices, conditionPaths } = form;
  const { index } = condition;
  const id = (part: string) => conditionFieldId(part, index);
  const remove = (
    <Button
      size="small"
      type="text"
      data-testid={id("remove")}
      aria-label={`Remove condition ${index + 1}`}
      disabled={bindingsLocked}
      onClick={() => removeCondition(index)}
    >
      ×
    </Button>
  );
  const feedback = condition.toError ? (
    <Typography.Text type="danger" data-testid={id("problem")}>
      {condition.toError}
    </Typography.Text>
  ) : condition.sentence ? (
    <Typography.Text type="secondary" data-testid={id("sentence")}>
      {condition.sentence}
    </Typography.Text>
  ) : null;
  if (condition.fixed || condition.expression !== undefined) {
    return (
      <Flex vertical gap="small" component="li" data-testid="widget-condition" data-index={index}>
        <div className="ww-builder-reaction">
          <Typography.Text data-testid={id("expression")} className="ww-builder-mono">
            {condition.fixed ? condition.sentence : condition.expression}
          </Typography.Text>
          <Typography.Text type="secondary">
            {condition.fixed ? "(one of — written in the inspector)" : "(words the form cannot edit)"}
          </Typography.Text>
          {remove}
        </div>
        {condition.fixed ? null : feedback}
      </Flex>
    );
  }
  if (condition.tree) {
    return (
      <Flex vertical gap="small" component="li" data-testid="widget-condition" data-index={index}>
        <div className="ww-builder-reaction">
          <Select
            id={id("is")}
            data-testid={id("is")}
            className="ww-builder-field"
            disabled={bindingsLocked}
            value={condition.is}
            onChange={(choice: string) => setCondition(index, "is", choice)}
            options={predicateChoices}
          />
          {remove}
        </div>
        <ConstructorGroup form={form} index={index} group={condition.tree} locked={bindingsLocked} />
        {feedback}
      </Flex>
    );
  }
  return (
    <Flex vertical gap="small" component="li" data-testid="widget-condition" data-index={index}>
      <div className="ww-builder-reaction">
        <TestFields
          id={id}
          test={condition}
          checks={predicateChoices}
          paths={conditionPaths}
          locked={bindingsLocked}
          onChange={(field, value) => setCondition(index, field, value)}
        />
        {remove}
      </div>
      {feedback}
    </Flex>
  );
}

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
  const {
    definition,
    fields,
    settings,
    events,
    conditions,
    setPortPath,
    setSetting,
    chooseSetting,
    addReaction,
    addCondition,
    suggestionsFor,
  } = form;
  if (!definition) return null;

  return (
    <ConfigProvider getPopupContainer={popupBeside}>
      {bindingsLocked ? (
        <Alert
          type="info"
          showIcon
          data-testid="bindings-locked"
          title="Your view changes settings only. Inputs, reactions and conditions belong to the shared page — turn the user overlay off to change them."
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

      {/* The CONDITION (doc/conditions-design.md): rows that must all hold
          for the widget to show, saved as the template's `when`. Wiring,
          like ports and reactions: read-only in a user's own view. */}
      <Flex vertical gap="small" data-testid="widget-conditions">
        <Typography.Text strong>Show when</Typography.Text>
        {conditions.length === 0 ? (
          <Typography.Text type="secondary" data-testid="widget-conditions-always">
            Always. Add a condition to show this widget only while the page&apos;s data says so.
          </Typography.Text>
        ) : (
          <Flex vertical gap="small" component="ul" className="ww-builder-reactions">
            {conditions.map((condition) => (
              <ConditionRow key={condition.index} form={form} condition={condition} bindingsLocked={bindingsLocked} />
            ))}
          </Flex>
        )}
        <div>
          <Button size="small" data-testid={conditionFieldId("add")} disabled={bindingsLocked} onClick={addCondition}>
            + condition
          </Button>
        </div>
      </Flex>
    </ConfigProvider>
  );
}
