/**
 * List position — the antd implementation of the `list-position` contract:
 * the rows in view of how many, how far into the list that is, and an antd
 * Slider over the whole list whose handle follows the list as it scrolls;
 * dragging it and letting go EMITS `changed` with the row to show, which
 * the default reaction writes back — the list bound to the same path
 * scrolls there. With `mode: "pages"` an antd Pagination stands in the
 * scale's place: its current page is the one the list stands in, and a page
 * chosen emits the same `changed` with that page's first row. Render-only:
 * logic in useListPosition.
 */
import { Flex, Pagination, Slider, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { listPositionContract } from "@wirework/widget-contracts";
import { useListPosition } from "../hooks/use-list-position";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type ListPositionEvents = (typeof listPositionContract)["events"];

function AntdListPosition({ viewModel, store, emit }: ContractProps<typeof listPositionContract>) {
  const view = useListPosition(
    store,
    emit,
    {
      position: viewModel.inputs.position,
      total: viewModel.inputs.total,
      hasMore: viewModel.inputs.hasMore,
      visible: viewModel.inputs.visible,
    },
    listPositionContract.io.inputs,
    viewModel.pageSize,
  );
  const paged = viewModel.mode === "pages";

  return (
    <Flex
      vertical={viewModel.vertical}
      align="center"
      gap={viewModel.vertical ? "small" : "middle"}
      className={viewModel.vertical ? "ww-list-position ww-list-position--vertical" : "ww-list-position"}
      data-testid="antd-list-position"
      data-orientation={viewModel.vertical ? "vertical" : "horizontal"}
      data-path={viewModel.inputs.position}
      data-position={view.position}
      data-visible={view.visible}
      data-total={view.total}
      data-open={view.open}
      data-percent={view.percent}
      data-mode={viewModel.mode}
      {...(paged ? { "data-page": view.page, "data-pages": view.pages } : {})}
    >
      {paged ? (
        // AS PAGES: the page the list stands in follows it as it scrolls; a page chosen is that page's first row.
        // It looks as the pagination under an antd Table does: small, at the right edge, the words where antd puts
        // a pagination's total — before the pages.
        <nav className="ww-list-position__pages" aria-label={viewModel.label}>
          <Pagination
            size="small"
            align="end"
            current={view.page}
            total={view.pagedTotal}
            pageSize={viewModel.pageSize}
            showSizeChanger={false}
            // Several pages at once: antd's own "•••" jumps five, and the "Go to" field any number.
            showQuickJumper={viewModel.showQuickJumper}
            showTotal={() => <span data-testid="list-position-page">{view.pageText}</span>}
            onChange={view.goTo}
          />
        </nav>
      ) : (
        <Slider
          className="ww-list-position__scale"
          ariaLabelForHandle={viewModel.label}
          // The end of the list not known: "row 401 of at least 800" — a bare number would read as a share of the whole.
          {...(view.valueText === undefined ? {} : { ariaValueTextFormatterForHandle: view.valueText })}
          // Upright, antd puts the minimum at the bottom: reversed, the start of the list is at the top.
          vertical={viewModel.vertical}
          reverse={viewModel.vertical}
          min={0}
          max={view.last}
          step={1}
          disabled={view.last === 0}
          value={view.position}
          tooltip={{ formatter: view.percentAt }}
          onChange={view.drag}
          onChangeComplete={view.release}
        />
      )}
      {viewModel.showRange ? <Typography.Text data-testid="list-position-range">{view.range}</Typography.Text> : null}
      {viewModel.showPercent && view.percent !== undefined ? (
        <Typography.Text type="secondary" data-testid="list-position-percent">
          {view.percent}%
        </Typography.Text>
      ) : null}
    </Flex>
  );
}

export const antdListPosition = implementContract(listPositionContract, {
  type: "antd-list-position",
  component: AntdListPosition,
});
