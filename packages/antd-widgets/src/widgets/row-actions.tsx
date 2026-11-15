/**
 * The ROW ACTIONS of the two antd tables (doc/ADR/0020-row-actions.md): the
 * cell at the start of a row that holds them, the header over it, and the
 * one STANDARD action — `favorite`, a star — which a host replaces by
 * registering its own under the same name (`createAntdTable({ rowActions })`).
 * Render-only: logic in useRowActions; WHEN an action shows is CSS.
 */
import { StarFilled, StarOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { RowActionEntry, TableRowActionProps, TableRowActions } from "../hooks/use-row-actions";
import type { RenderedRow } from "../hooks/use-table-rows";

/**
 * `favorite`: a star — outlined, and shown only with the row hovered, until
 * the row's `favorite` property (or the one `params.property` names) is
 * true; filled, and always in view, from then on. A press asks for the
 * other state: `row-action` with `detail: { active }`.
 */
export function FavoriteAction({ row, params, act }: TableRowActionProps) {
  const property = typeof params.property === "string" ? params.property : "favorite";
  const active = row[property] === true;
  return (
    <Button
      type="text"
      size="small"
      icon={active ? <StarFilled /> : <StarOutlined />}
      onClick={() => act({ active: !active })}
      aria-label="Favorite"
      aria-pressed={active}
      title={active ? "Remove from favorites" : "Add to favorites"}
      className="ww-table__favorite"
      data-active={active}
      // What it says is true of the row as it is: it stays in view without a hover.
      data-pinned={active}
    />
  );
}

/** The actions every antd table has; a host's own are laid over them by name. */
export const STANDARD_ROW_ACTIONS: TableRowActions = {
  favorite: FavoriteAction,
};

/** The standard actions with the host's over them — made once, where the table is made. */
export function rowActionsOf(own: TableRowActions | undefined): TableRowActions {
  return own === undefined ? STANDARD_ROW_ACTIONS : { ...STANDARD_ROW_ACTIONS, ...own };
}

/** The header over the actions: nothing to see, a name for a screen reader. */
export function RowActionsTitle() {
  return <span className="ww-table__actions-title">Row actions</span>;
}

export interface RowActionsCellProps {
  entries: RowActionEntry[];
  rendered: RenderedRow;
  act: (name: string, rendered: RenderedRow, detail?: Record<string, unknown>) => void;
}

export function RowActionsCell({ entries, rendered, act }: RowActionsCellProps) {
  return (
    <span className="ww-table__row-actions" data-testid="table-row-actions">
      {entries.map(({ key, name, Action, params }) => (
        <span key={key} className="ww-table__row-action" data-testid="table-row-action" data-name={name}>
          <Action
            row={rendered.row}
            rowKey={rendered.key}
            params={params}
            act={(detail) => act(name, rendered, detail)}
          />
        </span>
      ))}
    </span>
  );
}
