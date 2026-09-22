/**
 * @wirework/widget-contracts — the STANDARD widget kinds as contracts:
 * declarations without components (doc/widget-contracts-design.md).
 * Implement one with `implementContract` (@wirework/react); define your
 * own kinds with `defineContract` (@wirework/schema) and register them in
 * the host next to these.
 */
export { labelContract, LABEL_TONES } from "./label";
export type { LabelTone } from "./label";
export { buttonContract } from "./button";
export { inputContract, INPUT_TYPES, VALIDATION_RULES } from "./input";
export type { ValidationRule } from "./input";
export { paginationContract, PAGINATION_SIZES } from "./pagination";
export type { PaginationSize } from "./pagination";
export { refresherContract, refreshScheduleSchema, REFRESH_INTERVAL, REFRESH_TRIGGERS } from "./refresher";
export type { RefreshSchedule, RefreshTrigger } from "./refresher";
// The basics every UI library has.
export { selectContract, choiceOptionSchema, choiceOptionsSchema } from "./select";
export type { ChoiceOption } from "./select";
export { tagContract, TAG_TONES } from "./tag";
export type { TagTone } from "./tag";
export { checkboxContract } from "./checkbox";
export { progressContract, PROGRESS_TONES } from "./progress";
export type { ProgressTone } from "./progress";
export { alertContract, ALERT_TONES } from "./alert";
export type { AlertTone } from "./alert";
export { multiSelectContract } from "./multi-select";
export { tableContract, tableColumnSchema, tableRowsSchema } from "./table";
export type { TableColumn, TableRow } from "./table";
export { tableCellSchema, appPathSchema, cellText, cellTone, cellHref } from "./table-cell";
export type { TableCell, TableCellKind } from "./table-cell";
export { filterBarContract, filterDefinitionSchema, filterValuesSchema } from "./filter-bar";
export type { FilterDefinition, FilterValues } from "./filter-bar";

import { alertContract } from "./alert";
import { buttonContract } from "./button";
import { checkboxContract } from "./checkbox";
import { filterBarContract } from "./filter-bar";
import { inputContract } from "./input";
import { labelContract } from "./label";
import { multiSelectContract } from "./multi-select";
import { paginationContract } from "./pagination";
import { progressContract } from "./progress";
import { refresherContract } from "./refresher";
import { selectContract } from "./select";
import { tableContract } from "./table";
import { tagContract } from "./tag";

/** Everything a host registers at once. */
export const standardContracts = [
  labelContract,
  buttonContract,
  inputContract,
  paginationContract,
  refresherContract,
  selectContract,
  tagContract,
  checkboxContract,
  progressContract,
  alertContract,
  multiSelectContract,
  tableContract,
  filterBarContract,
];
