/**
 * Pagination — the antd implementation of the `pagination` contract. The
 * current page lives in the store; every click EMITS `changed` and the
 * required reaction writes it back, so a table bound to the same path
 * follows along. Render-only: logic in usePagination.
 */
import { Pagination, type PaginationProps } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { paginationContract } from "@wirework/widget-contracts";
import { usePagination } from "../hooks/use-pagination";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type PaginationEvents = (typeof paginationContract)["events"];

const showTotal: NonNullable<PaginationProps["showTotal"]> = (count, [from, to]) => `${from}-${to} of ${count}`;

function AntdPagination({ viewModel, store, emit }: ContractProps<typeof paginationContract>) {
  const { page, total, pageSize, change } = usePagination(
    store,
    emit,
    {
      page: viewModel.inputs.page,
      total: viewModel.inputs.total,
      pageSize: viewModel.inputs.pageSize,
    },
    paginationContract.io.inputs,
    // The page-size port is optional: without it the setting decides.
    viewModel.pageSize,
  );
  // The contract's density maps to antd's size ("default" is unset: the host's ConfigProvider decides).
  const density: Pick<PaginationProps, "size"> = viewModel.size === "small" ? { size: "small" } : {};

  return (
    <div data-testid="antd-pagination" data-page={page} data-total={total} data-page-size={pageSize}>
      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        {...density}
        showSizeChanger={viewModel.showSizeChanger}
        {...(viewModel.showTotal ? { showTotal } : {})}
        onChange={change}
      />
    </div>
  );
}

export const antdPagination = implementContract(paginationContract, {
  type: "antd-pagination",
  component: AntdPagination,
});
