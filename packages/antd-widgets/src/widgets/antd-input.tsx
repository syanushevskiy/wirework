/**
 * Text input — the antd implementation of the `input` contract: a
 * CONTROLLED antd Input whose text lives at the `value` port; every
 * keystroke EMITS `changed` with the text and its validity, and the
 * required reaction writes the text back. A failed rule sets the Input's
 * error status, `aria-invalid` and an alert message (what the contract's
 * conformance stories check). Validation rules: validation.ts.
 * Render-only: logic in useInput.
 */
import { Flex, Input, Typography } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { inputContract } from "@wirework/widget-contracts";
import { useInput } from "../hooks/use-input";

/** Exported so the hook can type its `emit` without a runtime cycle. */
export type InputEvents = (typeof inputContract)["events"];

function AntdInput({ viewModel, store, emit }: ContractProps<typeof inputContract>) {
  const { id, value, valid, message, change } = useInput(
    store,
    emit,
    viewModel.inputs.value,
    inputContract.io.inputs.value.default,
    viewModel,
  );
  return (
    <Flex vertical gap={4} data-testid="antd-input-field">
      <label htmlFor={id}>
        <Typography.Text>{viewModel.label}</Typography.Text>
      </label>
      <Input
        id={id}
        type={viewModel.type}
        data-testid="antd-input"
        data-path={viewModel.inputs.value}
        data-valid={valid}
        aria-invalid={!valid}
        status={valid ? undefined : "error"}
        placeholder={viewModel.placeholder}
        value={value}
        onChange={(event) => change(event.target.value)}
      />
      {message ? (
        <Typography.Text type="danger" role="alert" data-testid="antd-input-message">
          {message}
        </Typography.Text>
      ) : null}
    </Flex>
  );
}

export const antdInput = implementContract(inputContract, {
  type: "antd-input",
  component: AntdInput,
});
