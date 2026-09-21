/**
 * ALL palette logic lives here (guidelines: render-only components):
 *  - a card is a button, so it answers the pointer AND the keyboard
 *    (Enter/Space), which a plain clickable card would not,
 *  - the search filters the catalog by what the user typed — matched
 *    against the widget's type, its description and the contract kind it
 *    implements — and the same matches feed the autocomplete suggestions,
 *  - the catalog also opens WITHOUT typing ("Show widgets"), and the search
 *    starts over (`clear`) once a widget has been added. The builder hook
 *    owns this state (use-widget-builder), because "added" is its moment.
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
  /** Opened with the "Show widgets" button: the whole list, nothing typed. Stays until hidden or a widget is picked. */
  const [browsing, setBrowsing] = useState(false);

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
    // The "Show widgets" button is a TOGGLE: if its own focus opened the
    // catalog, the click that follows would find it open and close it again.
    onFocus: (event: FocusEvent<HTMLDivElement>) => {
      if (event.target instanceof Element && event.target.closest("[data-palette-toggle]")) return;
      setFocused(true);
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setFocused(false);
    },
  };

  /** Every registered widget, matching or not (tests compare the catalog against it). */
  const total = useMemo(() => groups.reduce((count, group) => count + group.widgets.length, 0), [groups]);

  const open = browsing || focused || query.trim() !== "";

  /**
   * Back to the start: nothing typed, the catalog closed. After a widget was
   * ADDED the search must not still hold the last query — and for hiding the
   * list, which a query or the focus would otherwise keep open.
   */
  const clear = useCallback(() => {
    setQuery("");
    setBrowsing(false);
    setFocused(false);
  }, []);

  /** The "Show widgets" button: the whole list without typing; pressed again it hides it. */
  const toggleBrowsing = useCallback(() => {
    if (open) clear();
    else setBrowsing(true);
  }, [open, clear]);

  /**
   * A widget was picked: browsing is over. The catalog stays while the
   * picked card has the focus (it shows as pressed) and closes when the user
   * moves on to the form — exactly like the search.
   */
  const picked = useCallback(() => setBrowsing(false), []);

  return { query, setQuery, options, items, total, open, focusProps, clear, toggleBrowsing, picked };
}

export type WidgetSearch = ReturnType<typeof useWidgetSearch>;
