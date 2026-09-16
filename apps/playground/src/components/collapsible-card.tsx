/**
 * Collapsible card — ONLY presentation (state in useDisclosure). An antd
 * Collapse, CLOSED by default; the header stays visible with a summary so
 * a collapsed panel still says what it holds. The wrapper carries
 * `data-state` so scenarios can assert open/closed.
 */
import type { ReactNode } from "react";
import { Collapse, Typography } from "antd";
import { useDisclosure } from "../hooks/use-disclosure";

export interface CollapsibleCardProps {
  /** Test-id root: `panel-<id>` on the card, `panel-<id>-toggle` on the header. */
  id: string;
  title: string;
  /** Shown in the header even when collapsed (counts, status). */
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleCard({ id, title, summary, defaultOpen = false, children }: CollapsibleCardProps) {
  const { open, toggle } = useDisclosure(defaultOpen);

  return (
    <div data-testid={`panel-${id}`} data-state={open ? "open" : "closed"}>
      <Collapse
        activeKey={open ? [id] : []}
        onChange={toggle}
        items={[
          {
            key: id,
            label: <span data-testid={`panel-${id}-toggle`}>{title}</span>,
            extra: summary ? (
              <Typography.Text type="secondary">{summary}</Typography.Text>
            ) : undefined,
            children,
          },
        ]}
      />
    </div>
  );
}
