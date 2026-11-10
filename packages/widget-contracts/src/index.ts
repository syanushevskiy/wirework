/**
 * @wirework/widget-contracts — the STANDARD widget kinds as contracts:
 * declarations without components (doc/widget-contracts-design.md).
 * Implement one with `implementContract` (@wirework/react); define your
 * own kinds with `defineContract` (@wirework/schema) and register them in
 * the host next to these.
 */
export { labelContract, LABEL_TONES } from "./label";
export type { LabelTone } from "./label";
export { buttonContract, BUTTON_VARIANTS } from "./button";
export type { ButtonVariant } from "./button";
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
export {
  tableContract,
  tableColumnSchema,
  columnFilterSchema,
  tableRowsSchema,
  tableEvents,
  tableHeaderEvents,
  tableHeaderPorts,
  searchValuesSchema,
  columnOrderSchema,
} from "./table";
export type { TableColumn, ColumnFilter, TableRow, SearchValues, ColumnOrder } from "./table";
export { tableCellSchema, appPathSchema, cellText, cellTone, cellHref } from "./table-cell";
export type { TableCell, TableCellKind } from "./table-cell";
export { filterBarContract, filterDefinitionSchema, filterValuesSchema } from "./filter-bar";
export type { FilterDefinition, FilterValues } from "./filter-bar";
export { infiniteTableContract } from "./infinite-table";
// More of what every UI library has.
export { switchContract } from "./switch";
export { sliderContract } from "./slider";
export { radioGroupContract } from "./radio-group";
export { rateContract } from "./rate";
export { statisticContract } from "./statistic";
export { dividerContract, DIVIDER_ORIENTATIONS } from "./divider";
export type { DividerOrientation } from "./divider";
// The dashboard set (doc/more-widgets-design.md): what a settings page and a filter row still lacked, and the
// display that replaces hand-laid labels.
export { numberContract } from "./number";
export { dateContract, DATE_PICKERS, DATE_FORMAT } from "./date";
export type { DatePicker } from "./date";
export { dateRangeContract, dateRangeSchema, NO_DATES } from "./date-range";
export type { DateRange } from "./date-range";
export {
  descriptionsContract,
  descriptionItemSchema,
  descriptionRecordSchema,
  DESCRIPTIONS_SIZES,
} from "./descriptions";
export type { DescriptionItem, DescriptionRecord, DescriptionsSize } from "./descriptions";
export { resultContract, RESULT_STATUSES } from "./result";
export type { ResultStatus } from "./result";
export { stepsContract, stepItemSchema, STEPS_DIRECTIONS } from "./steps";
export type { StepItem, StepsDirection } from "./steps";
export { timelineContract, timelineItemSchema, timelineItemsSchema, TIMELINE_MODES } from "./timeline";
export type { TimelineItem, TimelineMode } from "./timeline";
// Containers: a layout of other widgets inside (doc/containers-design.md).
export { cardContract, CARD_SIZES } from "./card";
export type { CardSize } from "./card";
export { tabsContract, layoutItemSchema } from "./tabs";
export type { LayoutItem } from "./tabs";
export { collapseContract } from "./collapse";
export { dialogContract, DIALOG_KINDS, DRAWER_PLACEMENTS } from "./dialog";
export type { DialogKind, DrawerPlacement } from "./dialog";

import { alertContract } from "./alert";
import { buttonContract } from "./button";
import { cardContract } from "./card";
import { checkboxContract } from "./checkbox";
import { collapseContract } from "./collapse";
import { dateContract } from "./date";
import { dateRangeContract } from "./date-range";
import { descriptionsContract } from "./descriptions";
import { dialogContract } from "./dialog";
import { dividerContract } from "./divider";
import { filterBarContract } from "./filter-bar";
import { infiniteTableContract } from "./infinite-table";
import { inputContract } from "./input";
import { labelContract } from "./label";
import { multiSelectContract } from "./multi-select";
import { numberContract } from "./number";
import { paginationContract } from "./pagination";
import { progressContract } from "./progress";
import { radioGroupContract } from "./radio-group";
import { rateContract } from "./rate";
import { refresherContract } from "./refresher";
import { resultContract } from "./result";
import { selectContract } from "./select";
import { sliderContract } from "./slider";
import { statisticContract } from "./statistic";
import { stepsContract } from "./steps";
import { switchContract } from "./switch";
import { tableContract } from "./table";
import { tabsContract } from "./tabs";
import { tagContract } from "./tag";
import { timelineContract } from "./timeline";

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
  infiniteTableContract,
  switchContract,
  sliderContract,
  radioGroupContract,
  rateContract,
  statisticContract,
  dividerContract,
  numberContract,
  dateContract,
  dateRangeContract,
  descriptionsContract,
  resultContract,
  stepsContract,
  timelineContract,
  cardContract,
  tabsContract,
  collapseContract,
  dialogContract,
];
