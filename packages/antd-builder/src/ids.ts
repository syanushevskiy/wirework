/**
 * The widget form's field ids — also its test ids, which a suite drives the
 * builder through. Named here, in one place, because they are part of what
 * this form promises anyone who automates it; published on their own
 * (`@wirework/antd-builder/ids`) so a test suite can import them without
 * the components.
 */
export const portFieldId = (port: string): string => `port-input-${port}`;
export const settingFieldId = (setting: string): string => `setting-${setting}`;
export const reactionFieldId = (event: string, part: string): string => `reaction-${event}-${part}`;
export const paramFieldId = (event: string, param: string): string => reactionFieldId(event, `param-${param}`);
