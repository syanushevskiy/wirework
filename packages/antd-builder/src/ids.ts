/**
 * The widget form's field ids — also its test ids, which a suite drives the
 * builder through. Named here, in one place, because they are part of what
 * this form promises anyone who automates it; published on their own
 * (`@wirework/antd-builder/ids`) so a test suite can import them without
 * the components.
 *
 * An event has a LIST of reactions: the first one's fields keep the plain
 * ids (`reaction-changed-set`), the second one's carry its ordinal
 * (`reaction-changed-2-set`), and so on — `index` counts from 0 as the
 * form does. The event's own controls are `reaction-<event>-default` (the
 * write-back it does by default) and `reaction-<event>-add`.
 */
export const portFieldId = (port: string): string => `port-input-${port}`;
export const settingFieldId = (setting: string): string => `setting-${setting}`;
/**
 * The entries of a NAMED-LIST setting (a tabs widget's `tabs`, a collapse's
 * `panels`), numbered like the reactions: `setting-tabs-label`,
 * `setting-tabs-2-label`, … (`index` from 0); an entry's other fields by
 * their name (`setting-panels-open`) and its `remove`; the list's own
 * control is `setting-tabs-add`.
 */
export const itemFieldId = (setting: string, part: string, index = 0): string =>
  settingFieldId(index === 0 ? `${setting}-${part}` : `${setting}-${index + 1}-${part}`);
export const reactionFieldId = (event: string, part: string, index = 0): string =>
  index === 0 ? `reaction-${event}-${part}` : `reaction-${event}-${index + 1}-${part}`;
export const paramFieldId = (event: string, param: string, index = 0): string =>
  reactionFieldId(event, `param-${param}`, index);
/**
 * The CONDITION rows ("Show when", doc/conditions-design.md), numbered like
 * the reactions: `condition-path`, `condition-2-path`, … (`index` from 0);
 * the section's own control is `condition-add`.
 */
export const conditionFieldId = (part: string, index = 0): string =>
  index === 0 ? `condition-${part}` : `condition-${index + 1}-${part}`;
