/**
 * A column's header with its filter UNDER the title — one cell of the
 * FILTER ROW both tables offer (`filterRow`; use-table-headers.ts): a search
 * field with the search icon for a text filter, a start and an end date for
 * a date column, a list of values to pick otherwise, always in view.
 * Render-only: logic in useHeaderFilter.
 */
import { SearchOutlined } from "@ant-design/icons";
import { DatePicker, Input, Select } from "antd";
import type { ColumnFilter, DateRange } from "@wirework/widget-contracts";
import { useHeaderFilter } from "../hooks/use-header-filter";
import type { ColumnChoice } from "../hooks/use-table-headers";

export interface HeaderFilterProps {
  title: string;
  property: string;
  filter: ColumnFilter;
  /** What is chosen of a list of values. */
  values: string[];
  /** What is searched for in a text column. */
  text: string;
  /** The period chosen of a date column: [from, to], either "" for open. */
  period: DateRange;
  /** The column's new choice. */
  change: (next: ColumnChoice) => void;
}

export function HeaderFilter(props: HeaderFilterProps) {
  return (
    <div className="ww-table__header">
      <span data-testid="table-column-title">{props.title}</span>
      <FilterControl {...props} testId="table-filter" />
    </div>
  );
}

/**
 * The control itself, by what is filtered by — under a column's title in the
 * filter row, and beside its label in the bar above the table (TableToolbar).
 */
export function FilterControl({
  title,
  property,
  filter,
  values,
  text,
  period,
  change,
  testId,
}: HeaderFilterProps & { testId: string }) {
  const view = useHeaderFilter(filter, values, text, period, change);
  return (
    <div
      className="ww-table__filter"
      data-testid={testId}
      data-column={title}
      data-property={property}
      data-kind={filter.kind}
      data-values={view.chosenAttribute}
      {...view.own}
    >
      {filter.kind === "values" ? (
        <Select
          mode="multiple"
          size="small"
          className="ww-select"
          aria-label={`Filter ${title}`}
          placeholder="All"
          allowClear
          maxTagCount="responsive"
          popupMatchSelectWidth={false}
          value={values}
          options={view.options}
          onChange={view.pickValues}
        />
      ) : filter.kind === "dates" ? (
        <div className="ww-table__period" role="group" aria-label={`Filter ${title}`}>
          <DatePicker
            {...view.picker}
            size="small"
            aria-label={`${title} from`}
            placeholder="From"
            value={view.start}
            onChange={view.pickStart}
          />
          <DatePicker
            {...view.picker}
            size="small"
            aria-label={`${title} to`}
            placeholder="To"
            value={view.end}
            onChange={view.pickEnd}
          />
        </div>
      ) : (
        <Input
          size="small"
          role="searchbox"
          aria-label={`Filter ${title}`}
          placeholder="Search"
          prefix={<SearchOutlined />}
          allowClear
          value={view.shown}
          onChange={(event) => view.type(event.target.value)}
          onPressEnter={view.apply}
          onBlur={view.apply}
          onClear={view.clear}
        />
      )}
    </div>
  );
}
