/**
 * The EDGE between the store's dates and antd's: the store holds TEXT
 * (`YYYY-MM-DD`, or ISO with the time and the offset when a time is picked
 * — @wirework/widget-contracts, `date`), antd's pickers hold dayjs values.
 * Two one-liners each way, and no timezone arithmetic: a day is the local
 * day the user picked, a moment carries its offset; the server decides what
 * either means.
 */
import dayjs, { type Dayjs } from "dayjs";
import { DATE_FORMAT, type DatePicker } from "@wirework/widget-contracts";

/** ISO 8601 with the offset, so a moment means the same thing wherever it is read. */
export const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ssZ";

/** The store's text as a dayjs value; nothing for "" or text that is no date. */
export const toDayjs = (text: string): Dayjs | null => {
  const parsed = dayjs(text);
  return text !== "" && parsed.isValid() ? parsed : null;
};

/** A picked value as the store's text; "" for nothing picked. */
export const toText = (date: Dayjs | null | undefined, withTime: boolean): string =>
  date === null || date === undefined ? "" : date.format(withTime ? DATE_TIME_FORMAT : DATE_FORMAT);

/**
 * What a PERIOD's two pickers are given (a table's date filter): with a time
 * — the default — a date and a time to the minute, applied as it is picked
 * or typed (no OK button: the filter's own Filter button, or the change
 * itself, applies it). ONE format, typed whole (`2026-11-03 23:59`): with a
 * second one for a day alone, antd takes the day the moment it is complete
 * and the time typed after it is lost.
 */
export const periodPicker = (withTime: boolean) =>
  withTime ? { showTime: { format: "HH:mm" }, format: "YYYY-MM-DD HH:mm", needConfirm: false } : {};

/**
 * What the user SEES, and types: the page's format when it gives one, else
 * the stored day's form (a date-time without its offset) — antd's own for a
 * week, a month or a year.
 */
export const shownFormat = (format: string | undefined, withTime: boolean, picker: DatePicker = "date") =>
  format ?? (withTime ? "YYYY-MM-DD HH:mm" : picker === "date" ? DATE_FORMAT : undefined);
