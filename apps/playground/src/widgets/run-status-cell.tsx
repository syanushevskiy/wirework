/**
 * A table cell the HOST renders (`createAntdTable({ cells })`, for what no
 * predefined cell kind of table-cell.ts in @wirework/widget-contracts can
 * show): a run's state as a tag, with the failure's message in a tooltip.
 * Registered by name at boot — a column selects it with
 * `cell: { kind: "custom", name: "run-status" }`; the page cannot change
 * what it shows. Render-only: logic in use-run-status-cell.
 */
import { Tag, Tooltip } from "antd";
import type { TableCellProps } from "@wirework/antd-widgets";
import { useRunStatusCell } from "../hooks/use-run-status-cell";

export function RunStatusCell({ text, row }: TableCellProps) {
  const { color, message } = useRunStatusCell(text, row);
  const tag = (
    <Tag color={color} data-testid="run-status" data-message={message}>
      {text}
    </Tag>
  );
  return message === undefined ? tag : <Tooltip title={message}>{tag}</Tooltip>;
}
