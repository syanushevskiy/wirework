/**
 * Widget palette — ONLY presentation (search and press logic in
 * use-widget-palette). A search box with autocomplete on top; the matching
 * widgets appear below it as cards WHILE THE SEARCH IS IN USE (focused, or
 * holding a query), each card a live, non-interactive preview with the
 * contract kind, the type and the description, flowing into as many
 * columns as the panel is wide (doc/widget-previews-design.md).
 */
import type { ReactNode } from "react";
import { AutoComplete, Card, Flex, Tag, Typography } from "antd";
import { WidgetPreview } from "@wirework/react";
import { usePalettePress, useWidgetSearch } from "../hooks/use-widget-palette";
import type { WidgetGroup } from "../hooks/use-widget-builder";

export interface WidgetPaletteProps {
  groups: WidgetGroup[];
  selected: string;
  onSelect: (type: string) => void;
  /** Rendered next to the search box (the host's "Add widget"). */
  action?: ReactNode;
}

export function WidgetPalette({ groups, selected, onSelect, action }: WidgetPaletteProps) {
  const press = usePalettePress(onSelect);
  const { query, setQuery, options, items, total, open, focusProps } = useWidgetSearch(groups);

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
        {action}
      </Flex>

      {!open ? null : items.length === 0 ? (
        <Typography.Text type="secondary" data-testid="widget-palette-empty">
          No widget matches “{query}”.
        </Typography.Text>
      ) : (
        <div className="pg-palette-cards">
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
