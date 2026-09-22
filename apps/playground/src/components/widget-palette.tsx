/**
 * Widget palette — ONLY presentation (search and press logic in
 * use-widget-palette). A search box with autocomplete on top, and a "Show
 * widgets" button for the whole list without typing; the matching widgets
 * appear below as cards WHILE THE SEARCH IS IN USE (focused, or holding a
 * query) or the list was asked for, each card a live, non-interactive preview with the
 * contract kind, the type and the description, flowing into as many
 * columns as the panel is wide.
 */
import type { ReactNode } from "react";
import { AutoComplete, Button, Card, Flex, Tag, Typography } from "antd";
import { WidgetPreview } from "@wirework/react";
import { usePalettePress, type WidgetSearch } from "../hooks/use-widget-palette";

export interface WidgetPaletteProps {
  /** The search and "Show widgets" state — owned by the builder, which starts it over after an add. */
  search: WidgetSearch;
  selected: string;
  onSelect: (type: string) => void;
  /** Rendered next to the search box (the host's "Add widget"). */
  action?: ReactNode;
}

export function WidgetPalette({ search, selected, onSelect, action }: WidgetPaletteProps) {
  const press = usePalettePress(onSelect);
  const { query, setQuery, options, items, total, open, focusProps, toggleBrowsing } = search;

  return (
    <div
      data-testid="widget-palette"
      data-state={open ? "open" : "closed"}
      data-registered={total}
      className="pg-palette"
      {...focusProps}
    >
      <Flex gap="small" wrap align="center">
        <AutoComplete
          data-testid="widget-search"
          className="pg-palette-search"
          aria-label="Search widgets"
          placeholder="search widgets…"
          size="small"
          allowClear
          value={query}
          options={options}
          onChange={(value: string) => setQuery(value ?? "")}
        />
        {/* The whole list without typing anything; pressed again it hides it. */}
        <Button
          size="small"
          data-testid="widget-browse"
          // Its focus must not open the catalog by itself (use-widget-palette).
          data-palette-toggle
          aria-expanded={open}
          aria-controls="widget-catalog"
          onClick={toggleBrowsing}
        >
          {open ? "Hide widgets" : "Show widgets"}
        </Button>
        {action}
      </Flex>

      {!open ? null : items.length === 0 ? (
        <Typography.Text type="secondary" data-testid="widget-palette-empty">
          No widget matches “{query}”.
        </Typography.Text>
      ) : (
        <div className="pg-palette-cards" id="widget-catalog">
          {items.map(({ type, description, definition, kind }) => (
            <Card
              key={type}
              size="small"
              hoverable
              className="pg-palette-card"
              data-testid="widget-card"
              data-widget={type}
              data-kind={kind}
              role="button"
              tabIndex={0}
              aria-pressed={selected === type}
              {...press(type)}
            >
              <Flex vertical gap={4} align="start">
                {/* Half the default frame (and half the scale, so the
                    same content still fits): the palette stays compact. */}
                <WidgetPreview definition={definition} width={120} height={55} scale={0.35} />
                <Flex gap={4} wrap align="center">
                  <Typography.Text code>{type}</Typography.Text>
                  {/* The contract this widget implements — unless the
                      widget's own name already says it. */}
                  {kind === "other" || kind === type ? null : <Tag>{kind}</Tag>}
                </Flex>
                {description ? (
                  <Typography.Text type="secondary">{description}</Typography.Text>
                ) : null}
              </Flex>
            </Card>
          ))}
        </div>
      )}
      {open ? (
        <Typography.Text type="secondary">Previews show sample data.</Typography.Text>
      ) : null}
    </div>
  );
}
