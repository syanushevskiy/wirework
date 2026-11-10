/**
 * One field of a descriptions widget: the TABLE's cell (TableCell — the
 * same kinds, the same host renderers) over the record's property, wrapped
 * so the field says which item, property and kind it shows. Render-only.
 */
import { getPath } from "@wirework/schema";
import type { DescriptionItem, DescriptionRecord } from "@wirework/widget-contracts";
import type { TableCellRenderers } from "../hooks/use-table-cell";
import { TableCell } from "./table-cells";

export function DescriptionField({
  item,
  record,
  cells,
}: {
  item: DescriptionItem;
  record: DescriptionRecord;
  cells: TableCellRenderers;
}) {
  return (
    <span
      data-testid="description-field"
      data-item={item.title}
      data-property={item.property}
      data-cell={item.cell?.kind ?? "text"}
    >
      {/* The record's property by dot path, as the table reads a row. */}
      <TableCell column={item} row={record} value={getPath(record, item.property)} cells={cells} />
    </span>
  );
}
