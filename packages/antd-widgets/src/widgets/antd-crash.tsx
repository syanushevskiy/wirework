/** Crash widget — throws during render to exercise the engine's per-cell
 *  error boundary. Testing purposes only. */
import { z } from "zod";
import { NO_EVENTS, NO_IO, type WidgetProps } from "@wirework/schema";
import { defineWidget } from "@wirework/react";

const viewModel = z.object({
  message: z.string().default("intentional crash"),
});

type VM = z.infer<typeof viewModel>;

function AntdCrash({ viewModel }: WidgetProps<VM, typeof NO_EVENTS>): never {
  throw new Error(viewModel.message);
}

export const antdCrash = defineWidget({
  type: "antd-crash",
  description: "Throws on render — proves the per-cell error boundary (testing only)",
  io: NO_IO,
  events: NO_EVENTS,
  viewModel,
  component: AntdCrash,
});
