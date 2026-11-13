/**
 * The cell selection's MENU — what a right click on a table's cell opens,
 * at the pointer: Copy, Copy with headers, Export as CSV. An antd Dropdown
 * hung on a point of the window (a mark with no size where the click was),
 * so it closes on a click elsewhere like any dropdown. Render-only: logic in
 * useCellSelection.
 */
import { createPortal } from "react-dom";
import { Dropdown } from "antd";
import { CELL_MENU, type CellSelectionView } from "../hooks/use-cell-selection";

/** Static, so built once: the two copies, a line, the export. */
const ITEMS = [CELL_MENU[0], CELL_MENU[1], { type: "divider" as const }, CELL_MENU[2]];

export function CellMenu({ view }: { view: CellSelectionView }) {
  const { menu } = view;
  // No menu while cells are not selected. Otherwise the dropdown is there from the start, closed, and opens where a
  // right click is.
  if (menu === undefined) return null;
  // The mark hangs on the BODY: inside the table a transformed ancestor (a grid engine moves its cells that way)
  // would make "fixed" mean "within that cell", and the menu would open somewhere else.
  return createPortal(
    <Dropdown
      open={menu.open}
      // "click", not "contextMenu": the hook opens it, and all this trigger adds is closing on a press elsewhere.
      // antd's context-menu trigger also closes the menu on ANY scroll of the window — a page that settles under
      // the pointer (a panel growing, a list loading) would take the menu away before a choice is made.
      trigger={["click"]}
      menu={{ items: ITEMS, onClick: ({ key }) => view.choose(key) }}
      onOpenChange={(open) => {
        if (!open) view.closeMenu();
      }}
    >
      <span className="ww-table__menu-at" data-testid="table-cell-menu" style={{ left: menu.x, top: menu.y }} />
    </Dropdown>,
    document.body,
  );
}
