/** ALL antd-date-range logic lives here (guidelines: render-only components). */
import { useCallback, useMemo } from "react";
import type { Dayjs } from "dayjs";
import type { Emit, PortDefinition, ReadableStore } from "@wirework/schema";
import { usePort } from "@wirework/react";
import { NO_DATES, type DateRange } from "@wirework/widget-contracts";
import type { DateRangeEvents } from "../widgets/antd-date-range";
import { shownFormat, toDayjs, toText } from "./dates";

/** antd's pair: either end may be unset while the user is still picking. */
type Picked = [Dayjs | null, Dayjs | null] | null;

export function useDateRange(
  store: ReadableStore,
  emit: Emit<DateRangeEvents>,
  path: string,
  port: PortDefinition<DateRange>,
  { withTime, format }: { withTime: boolean; format?: string | undefined },
) {
  const texts = usePort(store, path, port) ?? NO_DATES;
  const value = useMemo<Picked>(() => [toDayjs(texts[0]), toDayjs(texts[1])], [texts]);
  // The widget only EMITS; the view model's reaction stores the pair.
  const change = useCallback(
    (next: Picked) => emit("changed", { value: [toText(next?.[0], withTime), toText(next?.[1], withTime)] }),
    [emit, withTime],
  );
  return { value, texts, format: shownFormat(format, withTime), change };
}
