/**
 * The standard contracts (@wirework/widget-contracts) as a host registers
 * them: every one registers, an implementation of each passes the widget
 * registry's contract check (ports with validators and valid defaults,
 * matching kind), and every palette preview parses with its own schema —
 * a broken preview would show "no preview" in the builder.
 */
import { describe, expect, it } from "vitest";
import type { AnyWidgetDefinition } from "@wirework/schema";
import { standardContracts } from "@wirework/widget-contracts";
import { createContracts, createRegistry } from "../index";

const contracts = createContracts();
for (const contract of standardContracts) contracts.register(contract);

describe("standard contracts", () => {
  it("have unique kinds, including the basics from doc/widget-catalog.md", () => {
    expect(contracts.keys()).toEqual(
      expect.arrayContaining([
        "label",
        "button",
        "input",
        "pagination",
        "refresher",
        "select",
        "tag",
        "checkbox",
        "progress",
        "alert",
        "multi-select",
        "table",
      ]),
    );
  });

  it.each(standardContracts.map((contract) => [contract.kind, contract] as const))(
    "%s: an implementation registers, and its preview parses",
    (kind, contract) => {
      const implementation: AnyWidgetDefinition = { ...contract, type: `test-${kind}`, component: () => null };
      expect(() => createRegistry({ contracts }).register(implementation)).not.toThrow();
      expect(() => contract.viewModel.parse(contract.preview?.viewModel ?? {})).not.toThrow();
    },
  );
});
