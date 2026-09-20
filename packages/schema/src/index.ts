/**
 * @wirework/schema — contracts, model types and the shared path rules for
 * the Wirework widget engine. Depends on zod only. Widget code imports this
 * package plus its framework adapter (see contracts/widget.ts).
 */
export * from "./contracts/names";
export * from "./contracts/store";
export * from "./contracts/widget";
export * from "./contracts/io";
export * from "./contracts/events";
export * from "./contracts/reactions";
export * from "./contracts/actions";
export * from "./contracts/widget-contract";
export * from "./contracts/settings";
export * from "./contracts/layout-engine";
export * from "./models/view-models";
export * from "./models/user-view-models";
export * from "./paths";
