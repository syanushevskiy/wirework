/**
 * The four extension points share one registry implementation, so the
 * guarantees are tested once and the per-registry invariants on top.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { NO_EVENTS, defineContract } from "@wirework/schema";
import {
  createActions,
  createContracts,
  createLayoutEngines,
  createRegistry,
  RegistrationError,
} from "../index";
import { counter, listEngine, plain } from "./fixtures";

describe("shared registry guarantees", () => {
  it("keeps what it registered and lists it", () => {
    const registry = createRegistry();
    registry.register(counter);
    registry.register(plain);
    expect(registry.get("counter")).toBe(counter);
    expect(registry.types()).toEqual(["counter", "plain"]);
    expect(registry.list()).toHaveLength(2);
    expect(registry.get("nope")).toBeUndefined();
  });

  it("refuses a duplicate key and a non-kebab name", () => {
    const registry = createRegistry();
    registry.register(counter);
    expect(() => registry.register(counter)).toThrow(/already registered/);
    expect(() => registry.register({ ...counter, type: "Not Kebab" })).toThrow(RegistrationError);
    expect(() => registry.register({ ...counter, type: "" })).toThrow(/not a valid identifier/);
  });

  it("names the registry and the key on the error", () => {
    try {
      createActions().register({ name: "Bad Name", handler: () => undefined });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RegistrationError);
      expect(error).toMatchObject({ registry: "action", key: "Bad Name" });
    }
  });
});

describe("widget registry", () => {
  it("rejects a definition missing any required part", () => {
    const registry = createRegistry();
    expect(() => registry.register({ ...counter, component: undefined as never })).toThrow(/has no component/);
    expect(() => registry.register({ ...counter, viewModel: undefined as never })).toThrow(/view-model validator/);
    expect(() => registry.register({ ...counter, io: undefined as never })).toThrow(/IO declaration/);
    expect(() => registry.register({ ...counter, events: undefined as never })).toThrow(/events declaration/);
    expect(() => registry.register({ ...counter, events: { "Not Kebab": { payload: z.string() } } })).toThrow(/kebab-case/);
    expect(() => registry.register({ ...counter, events: { ok: {} as never } })).toThrow(/payload validator/);
  });
});

describe("layout-engine registry", () => {
  it("requires a validator, every operation and a renderer", () => {
    const engines = createLayoutEngines();
    engines.register(listEngine);
    expect(engines.names()).toEqual(["list"]);
    expect(() => engines.register({ ...listEngine, name: "x", template: undefined as never })).toThrow(/template validator/);
    expect(() => engines.register({ ...listEngine, name: "y", appendCell: undefined as never })).toThrow(/"appendCell"/);
    expect(() => engines.register({ ...listEngine, name: "z", renderer: null })).toThrow(/renderer/);
  });
});

describe("action registry", () => {
  it("accepts namespaced names, as the actions design requires", () => {
    const actions = createActions();
    actions.register({ name: "runs/load", handler: () => undefined });
    actions.register({ name: "reset-counter", handler: () => undefined });
    expect(actions.names()).toEqual(["runs/load", "reset-counter"]);
    expect(() => actions.register({ name: "a/b/c", handler: () => undefined })).toThrow(/not a valid identifier/);
    expect(() => actions.register({ name: "load", handler: undefined as never })).toThrow(/has no handler/);
  });
});

describe("contract registry", () => {
  const contract = defineContract({
    kind: "badge",
    io: { inputs: {} },
    events: NO_EVENTS,
    settings: z.object({ text: z.string().default("") }),
  });

  it("registers a contract and lists its kind", () => {
    const contracts = createContracts();
    contracts.register(contract);
    expect(contracts.kinds()).toEqual(["badge"]);
    expect(contracts.get("badge")).toBe(contract);
  });

  it("regression: rejects io or events that are null, not just missing", () => {
    const contracts = createContracts();
    expect(() => contracts.register({ ...contract, kind: "a", events: null as never })).toThrow(/events declaration/);
    expect(() => contracts.register({ ...contract, kind: "b", io: null as never })).toThrow(/IO declaration/);
    expect(() => contracts.register({ ...contract, kind: "c", viewModel: undefined as never })).toThrow(/view-model validator/);
  });
});
