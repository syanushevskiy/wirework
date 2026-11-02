/**
 * Statistic — the antd implementation of the `statistic` contract: an antd
 * Statistic showing the number (or text) at the `value` port, with its
 * title, prefix, suffix and precision. Render-only: logic in useStatistic.
 */
import { Statistic } from "antd";
import type { ContractProps } from "@wirework/schema";
import { implementContract } from "@wirework/react";
import { statisticContract } from "@wirework/widget-contracts";
import { useStatistic } from "../hooks/use-statistic";

function AntdStatistic({ viewModel, store }: ContractProps<typeof statisticContract>) {
  const { value } = useStatistic(store, viewModel.inputs.value, statisticContract.io.inputs.value);
  return (
    <div data-testid="antd-statistic" data-path={viewModel.inputs.value} data-value={value}>
      <Statistic
        title={viewModel.title}
        value={value}
        {...(viewModel.prefix === undefined ? {} : { prefix: viewModel.prefix })}
        {...(viewModel.suffix === undefined ? {} : { suffix: viewModel.suffix })}
        {...(viewModel.precision === undefined ? {} : { precision: viewModel.precision })}
      />
    </div>
  );
}

export const antdStatistic = implementContract(statisticContract, {
  type: "antd-statistic",
  component: AntdStatistic,
});
