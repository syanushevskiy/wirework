/**
 * Event log — ONLY presentation (logic in use-event-log). Collapsed by
 * default; the header count keeps counting while collapsed because the
 * subscription lives in this component, not in the collapsible content.
 * Every row carries the widget type, event name and source cell as data
 * attributes so scenarios can assert on exactly which cell emitted what.
 */
import { Button, Flex, Typography } from "antd";
import type { EventBus } from "@wirework/schema";
import { CollapsibleCard } from "./collapsible-card";
import { useEventLog } from "../hooks/use-event-log";

export function EventLog({ bus }: { bus: EventBus }) {
  const { events, clear } = useEventLog(bus);

  return (
    <CollapsibleCard
      id="events"
      title="Events"
      summary={
        <span data-testid="event-log-count">
          {events.length === 0 ? "none yet" : `${events.length} logged`}
        </span>
      }
    >
      <Flex vertical gap="small" align="start">
        <ol className="pg-event-list">
          {events.map((event) => (
            <li
              key={event.seq}
              data-testid="event-log-row"
              data-seq={event.seq}
              data-widget={event.widget}
              data-event={event.name}
              data-cell={event.cell}
              className="pg-event-row"
            >
              <Typography.Text type="secondary">#{event.seq}</Typography.Text>
              <span>
                {event.widget}/{event.name}
              </span>
              <Typography.Text type="secondary">from {event.cell}</Typography.Text>
              <code data-testid="event-log-payload">{event.payload}</code>
            </li>
          ))}
        </ol>
        <Button size="small" data-testid="event-log-clear" disabled={events.length === 0} onClick={clear}>
          Clear
        </Button>
      </Flex>
    </CollapsibleCard>
  );
}
