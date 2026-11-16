/**
 * The PERIOD a date column's filter opens from its header (both tables,
 * use-table-headers.ts): a start and an end date — two fields, typed or
 * picked, either may stay empty for an open end — with Filter and Reset,
 * the standard antd "custom filter panel". Render-only: logic in
 * useHeaderPeriod.
 */
import { Button, DatePicker, Space } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import { useHeaderPeriod } from "../hooks/use-header-period";

export function HeaderPeriod({ title, time, ...dropdown }: FilterDropdownProps & { title: string; time: boolean }) {
  const { start, end, from, to, picker, pickStart, pickEnd, apply, reset } = useHeaderPeriod(dropdown, time);
  return (
    <div
      className="ww-table__dropdown"
      data-testid="header-period"
      data-column={title}
      data-from={from}
      data-to={to}
      role="group"
      aria-label={`Period of ${title}`}
    >
      <Space>
        <DatePicker
          {...picker}
          aria-label={`${title} from`}
          placeholder="Start date"
          value={start}
          onChange={pickStart}
        />
        <DatePicker {...picker} aria-label={`${title} to`} placeholder="End date" value={end} onChange={pickEnd} />
      </Space>
      <Space>
        <Button type="primary" size="small" onClick={apply}>
          Filter
        </Button>
        <Button size="small" onClick={reset}>
          Reset
        </Button>
      </Space>
    </div>
  );
}
