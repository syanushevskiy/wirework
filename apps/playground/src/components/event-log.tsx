/**
 * Event log — ONLY presentation (logic in use-event-log). Collapsed by
 * default; the header count keeps counting while collapsed because the
 * subscription lives in this component, not in the collapsible content.
 * Every row carries the widget type, event name and source cell as data
 * attributes so scenarios can assert on exactly which cell emitted what.
 */
import type { EventBus } from "@wirework/schema";
import { Button } from "@/components/ui/button";
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
      <ol className="grid max-h-64 gap-1 overflow-y-auto font-mono text-xs">
        {events.map((event) => (
          <li
            key={event.seq}
            data-testid="event-log-row"
            data-seq={event.seq}
            data-widget={event.widget}
            data-event={event.name}
            data-cell={event.cell}
            className="flex flex-wrap gap-x-2"
          >
            <span className="text-muted-foreground">#{event.seq}</span>
            <span>
              {event.widget}/{event.name}
            </span>
            <span className="text-muted-foreground">from {event.cell}</span>
            <code data-testid="event-log-payload">{event.payload}</code>
          </li>
        ))}
      </ol>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="event-log-clear"
          disabled={events.length === 0}
          onClick={clear}
        >
          Clear
        </Button>
      </div>
    </CollapsibleCard>
  );
}
