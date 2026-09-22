/**
 * ALL run-status-cell logic lives here (guidelines: render-only components):
 * the tone of a run's state, and the failure's message, which a page
 * cannot ask for without code — a cell reads ONE property, this one two.
 */
import type { TagProps } from "antd";
import type { TableRow } from "@wirework/widget-contracts";

const STATE_COLOR: Record<string, TagProps["color"]> = {
  Success: "success",
  Failed: "error",
  Running: "processing",
};

export function useRunStatusCell(text: string, row: TableRow) {
  const message = row["message"];
  return {
    color: STATE_COLOR[text],
    message: typeof message === "string" && message !== "" ? message : undefined,
  };
}
