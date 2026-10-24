/**
 * The blank space around the infinite table's ROW WINDOW
 * (doc/row-window-design.md): antd renders the window's rows into a table
 * body of ours, which puts a blank row as tall as the rows above the window
 * before them and one as tall as the rows below after them — so the
 * scrollbar and the end of the list are where every row rendered would put
 * them. The body is ONE stable component (a new one per scroll would
 * remount every row); the space reaches it through a context the widget
 * provides. Render-only: the numbers come from useRowWindow.
 */
import { createContext, useContext, type HTMLAttributes } from "react";
import type { TableProps } from "antd";
import type { RenderedRow } from "../hooks/use-table-rows";

export interface RowSpace {
  /** Blank space above and below the rendered rows, px. */
  above: number;
  below: number;
  /** How many columns a blank row spans. */
  columns: number;
}

const NO_SPACE: RowSpace = { above: 0, below: 0, columns: 1 };
const RowSpaceContext = createContext<RowSpace>(NO_SPACE);
export const RowSpaceProvider = RowSpaceContext.Provider;

/** A blank row as tall as the rows it stands in for; nothing when there are none. */
function Spacer({ height, place, columns }: { height: number; place: "above" | "below"; columns: number }) {
  if (height <= 0) return null;
  return (
    <tr className="ww-infinite-table__spacer" data-spacer={place} aria-hidden style={{ height }}>
      <td colSpan={columns} />
    </tr>
  );
}

function SpacedBody({ children, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  const { above, below, columns } = useContext(RowSpaceContext);
  return (
    <tbody {...rest}>
      <Spacer height={above} place="above" columns={columns} />
      {children}
      <Spacer height={below} place="below" columns={columns} />
    </tbody>
  );
}

/** antd's `components` for a table whose body is a window of its rows. */
export const SPACED_BODY: NonNullable<TableProps<RenderedRow>["components"]> = { body: { wrapper: SpacedBody } };
