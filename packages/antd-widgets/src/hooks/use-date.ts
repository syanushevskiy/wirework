/** ALL antd-date logic lives here (guidelines: render-only components). */
import { useCallback, useId, useMemo } from "react";
import type { Dayjs } from "dayjs";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import type { DatePicker } from "@wirework/widget-contracts";
import type { DateEvents } from "../widgets/antd-date";
import { shownFormat, toDayjs, toText } from "./dates";

export interface DateLook {
  withTime: boolean;
  picker: DatePicker;
  format?: string | undefined;
}

export function useDate(
  store: ReadableStore,
  emit: Emit<DateEvents>,
  path: string,
  port: PortDefinition<string>,
  { withTime, picker, format }: DateLook,
) {
  /** Associates the visible label with the field. */
  const id = useId();
  const text = usePort(store, path, port) ?? "";
  const value = useMemo(() => toDayjs(text), [text]);
  // The widget only EMITS; the view model's reaction stores the text.
  const change = useCallback(
    (next: Dayjs | null) => emit("changed", { value: toText(next, withTime) }),
    [emit, withTime],
  );
  return { id, value, text, format: shownFormat(format, withTime, picker), change };
}
