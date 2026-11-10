/**
 * Dialog — the antd implementation of the `dialog` contract: an antd Modal
 * or Drawer (the `as` setting) open while the `open` port is true, with the
 * layout the template holds rendered inside by the adapter (NestedLayout)
 * like a card's; closing — the close icon, the mask, Escape — EMITS
 * `changed { open: false }` and the default reaction writes it back. With
 * `inline` antd renders the dialog in place (`getContainer={false}`) inside
 * a positioned box, for previews and stories. Render-only: logic in
 * useDialog.
 */
import { Drawer, Modal } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract, NestedLayout } from "@wirework/react";
import { dialogContract } from "@wirework/widget-contracts";
import { useDialog } from "../hooks/use-dialog";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type DialogEvents = (typeof dialogContract)["events"];

function AntdDialog({ viewModel, store, emit }: ContractProps<typeof dialogContract>) {
  const { open, close } = useDialog(store, emit, viewModel.inputs.open, dialogContract.io.inputs.open);
  const content = viewModel.content === undefined ? null : <NestedLayout template={viewModel.content} />;
  const title = viewModel.title === undefined ? {} : { title: viewModel.title };
  const container = viewModel.inline ? { getContainer: false as const } : {};
  return (
    <div
      className={viewModel.inline ? "ww-dialog ww-dialog--inline" : "ww-dialog"}
      data-testid="antd-dialog"
      data-path={viewModel.inputs.open}
      data-open={open}
      data-as={viewModel.as}
    >
      {viewModel.as === "drawer" ? (
        <Drawer
          open={open}
          placement={viewModel.placement}
          {...(viewModel.width === undefined ? {} : { size: viewModel.width })}
          {...title}
          {...container}
          onClose={close}
        >
          {content}
        </Drawer>
      ) : (
        <Modal
          open={open}
          footer={null}
          {...(viewModel.width === undefined ? {} : { width: viewModel.width })}
          {...title}
          {...container}
          onCancel={close}
        >
          {content}
        </Modal>
      )}
    </div>
  );
}

export const antdDialog = implementContract(dialogContract, { type: "antd-dialog", component: AntdDialog });
