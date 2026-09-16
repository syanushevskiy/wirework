/**
 * ALL palette logic lives here (guidelines: render-only components):
 *  - a card is a button, so it answers the pointer AND the keyboard
 *    (Enter/Space), which a plain clickable card would not,
 *  - the search filters the catalog by what the user typed — matched
 *    against the widget's type, its description and the contract kind it
 *    implements — and the same matches feed the autocomplete suggestions.
 */
import { useCallback, useMemo, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { AnyWidgetDefinition } from "@wirework/schema";
import type { WidgetGroup } from "./use-widget-builder";

/** One palette card: a widget, plus the contract kind it implements. */
export interface PaletteItem {
  type: string;
  description?: string;
  definition: AnyWidgetDefinition;
  kind: string;
}

export function usePalettePress(onSelect: (type: string) => void) {
  return useCallback(
    (type: string) => ({
      onClick: () => onSelect(type),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(type);
      },
    }),
    [onSelect],
  );
}

export function useWidgetSearch(groups: WidgetGroup[]) {
  const [query, setQuery] = useState("");
  /** The catalog is a PICKER: it opens with the search and closes after it. */
  const [focused, setFocused] = useState(false);

  /** Groups keep their order; a group with no match disappears entirely. */
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === "") return groups;
    return groups.flatMap((group) => {
      const widgets = group.widgets.filter((widget) =>
        [widget.type, widget.description ?? "", group.kind, group.label].some((text) =>
          text.toLowerCase().includes(needle),
        ),
      );
      return widgets.length === 0 ? [] : [{ ...group, widgets }];
    });
  }, [groups, query]);

  /**
   * ONE list, kind-ordered: a card grid fills its rows whatever a kind's
   * size is, and each card names its kind — several kinds of one widget
   * each would otherwise take a row apiece.
   */
  const items = useMemo<PaletteItem[]>(
    () =>
      matching.flatMap((group) =>
        group.widgets.map((widget) => ({ ...widget, kind: group.kind })),
      ),
    [matching],
  );

  /** Suggestions are exactly what the cards below show. */
  const options = useMemo(
    () => items.map((item) => ({ value: item.type, label: item.type })),
    [items],
  );

  /**
   * Focus tracked on the whole palette, not on the search box: picking a
   * card moves focus to that card, which must NOT close the catalog before
   * the click lands.
   */
  const focusProps = {
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setFocused(false);
    },
  };

  return { query, setQuery, options, items, open: focused || query.trim() !== "", focusProps };
}
