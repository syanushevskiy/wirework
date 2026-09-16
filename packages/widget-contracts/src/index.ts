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

import { buttonContract } from "./button";
import { inputContract } from "./input";
import { paginationContract } from "./pagination";
import { labelContract } from "./label";

/** Everything a host registers at once. */
export const standardContracts = [labelContract, buttonContract, inputContract, paginationContract];
