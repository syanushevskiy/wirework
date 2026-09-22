/** antd's preset status colours for the `tag` contract's semantic tones — shared by the tag widget and tag cells. */
import type { TagProps } from "antd";
import type { TagTone } from "@wirework/widget-contracts";

export const TAG_COLOR = {
  default: undefined,
  info: "processing",
  success: "success",
  warning: "warning",
  danger: "error",
} as const satisfies Record<TagTone, TagProps["color"]>;
