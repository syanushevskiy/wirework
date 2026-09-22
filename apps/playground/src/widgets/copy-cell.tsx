/**
 * A table cell the HOST renders (`createAntdTable({ cells })`): the value
 * with a "Copy" button that puts it on the clipboard — a cell that ACTS,
 * which no predefined cell kind does. Registered as "copy" at boot; a
 * column selects it with `cell: { kind: "custom", name: "copy" }`. The
 * button owns its click: the table never treats it as a row click.
 * Render-only: logic in use-copy-cell.
 */
import { Button, Space } from "antd";
import type { TableCellProps } from "@wirework/antd-widgets";
import { useCopyCell } from "../hooks/use-copy-cell";

export function CopyCell({ text }: TableCellProps) {
  const { copied, copy } = useCopyCell(text);
  return (
    <Space size="small" data-testid="copy-cell" data-copied={copied}>
      <span>{text}</span>
      {text === "" ? null : (
        <Button size="small" onClick={copy} aria-label={`Copy ${text}`}>
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
    </Space>
  );
}
