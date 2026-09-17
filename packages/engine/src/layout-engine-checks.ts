/**
 * Behavioural conformance of a layout-engine plugin — the promises every
 * engine makes about ANY template, checked from its own empty template:
 *  - `empty()` is a valid template with no cells and no warnings;
 *  - `appendCell` keeps the cell's identity and binding, in order, and the
 *    result is still valid;
 *  - `removeCell` removes exactly that cell, and ignores an unknown id;
 *  - no operation mutates the template it was given (hosts REPLAY ops).
 * The registry checks that the operations exist; this checks what they do.
 * Returns the broken promises (empty = conformant), so every engine
 * package's unit tests run the same list (team-tiger review, Sasha: the
 * operations that write saved view models had no tests at all).
 * `applyChange` payloads are engine-specific: each package tests its own.
 */
import type { AnyLayoutEngine, CellBase, PageViewModel } from "@wirework/schema";
import { errorText } from "./messages";

const SAMPLE_CELLS: readonly CellBase[] = [
  { id: "first", widget: "sample-widget", model: "widgets.sample.first", template: "default" },
  { id: "second", widget: "sample-widget", model: "widgets.sample.second", template: "compact" },
];

const binding = ({ id, widget, model, template }: CellBase): CellBase => ({ id, widget, model, template });

export function layoutEngineProblems(engine: AnyLayoutEngine): string[] {
  const problems: string[] = [];
  const expect = (holds: boolean, promise: string): void => {
    if (!holds) problems.push(promise);
  };
  const valid = (template: PageViewModel, step: string): void => {
    try {
      engine.template.parse(template);
    } catch (error) {
      problems.push(`${step}: the result fails the engine's own template validator (${errorText(error)})`);
    }
    const warnings = engine.validate?.(template) ?? [];
    expect(warnings.length === 0, `${step}: the result has validation warnings: ${warnings.join("; ")}`);
  };
  /** Runs an operation and checks it left its input untouched. */
  const pure = <T>(template: PageViewModel, step: string, operation: () => T): T => {
    const before = JSON.stringify(template);
    const result = operation();
    expect(JSON.stringify(template) === before, `${step}: mutated the template it was given`);
    return result;
  };

  try {
    const empty = engine.empty();
    valid(empty, "empty()");
    expect(engine.cells(empty).length === 0, "empty(): has cells");

    const withFirst = pure(empty, "appendCell", () => engine.appendCell(empty, SAMPLE_CELLS[0]!));
    const withBoth = pure(withFirst, "appendCell", () => engine.appendCell(withFirst, SAMPLE_CELLS[1]!));
    valid(withBoth, "appendCell");
    expect(
      JSON.stringify(engine.cells(withBoth).map(binding)) === JSON.stringify(SAMPLE_CELLS),
      "appendCell: cells() does not list the appended cells, in order, with their id, widget, model and template",
    );

    const removed = pure(withBoth, "removeCell", () => engine.removeCell(withBoth, "first"));
    valid(removed, "removeCell");
    expect(
      JSON.stringify(engine.cells(removed).map((cell) => cell.id)) === JSON.stringify(["second"]),
      "removeCell: did not remove exactly the given cell",
    );
    const unknown = pure(withBoth, "removeCell", () => engine.removeCell(withBoth, "no-such-cell"));
    expect(engine.cells(unknown).length === 2, "removeCell: an unknown id changed the cells");
  } catch (error) {
    problems.push(`an operation threw: ${errorText(error)}`);
  }
  return problems;
}
