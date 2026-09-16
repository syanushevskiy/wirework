/** Echo — subscribes to a store path and renders whatever lives there,
 *  with antd Typography. Render-only: all logic in useEchoValue. */
import { Flex, Typography } from "antd";
import { z } from "zod";
import {
  ioBindingsSchema,
  NO_EVENTS,
  type WidgetIO,
  type WidgetProps,
} from "@wirework/schema";
import { defineWidget } from "@wirework/react";
import { useEchoValue } from "../hooks/use-echo-value";

const io = {
  inputs: {
    value: { description: "Value to display", value: z.unknown() },
  },
} satisfies WidgetIO;

const viewModel = ioBindingsSchema(io).extend({
  label: z.string().optional(),
});

type VM = z.infer<typeof viewModel>;

function AntdEcho({ viewModel, store }: WidgetProps<VM, typeof NO_EVENTS>) {
  const display = useEchoValue(store, viewModel.inputs.value);
  return (
    <Flex gap="small" align="baseline" data-testid="antd-echo" data-path={viewModel.inputs.value}>
      {viewModel.label ? <Typography.Text strong>{viewModel.label}:</Typography.Text> : null}
      <Typography.Text code data-testid="antd-echo-value">
        {display}
      </Typography.Text>
    </Flex>
  );
}

export const antdEcho = defineWidget({
  type: "antd-echo",
  description: "Shows whatever lives at a store path, as JSON (∅ when nothing does)",
  preview: {
    seed: { preview: { value: { ok: true, n: 42 } } },
    viewModel: { inputs: { value: "preview.value" }, label: "Value" },
  },
  io,
  events: NO_EVENTS,
  viewModel,
  component: AntdEcho,
});
