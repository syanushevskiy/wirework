/** One timeline entry's content: the heading, when there is one, over the text; the tone exposed for tests. Render-only. */
import { Typography } from "antd";
import type { TimelineItem } from "@wirework/widget-contracts";

export function TimelineEntry({ entry }: { entry: TimelineItem }) {
  return (
    <span data-testid="timeline-entry" data-tone={entry.tone ?? "default"}>
      {entry.title === undefined ? null : <Typography.Text strong>{entry.title} </Typography.Text>}
      {entry.text}
    </span>
  );
}
