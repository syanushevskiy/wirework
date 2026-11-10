/**
 * A column's header with its filter UNDER the title — one cell of the
 * FILTER ROW both tables offer (`filterRow`; use-table-headers.ts): a search
 * field with the search icon for a text filter, a list of values to pick
 * otherwise, always in view. Render-only: logic in useHeaderFilter.
 */
import { SearchOutlined } from "@ant-design/icons";
import { Input, Select } from "antd";
import type { ColumnFilter } from "@wirework/widget-contracts";
import { useHeaderFilter } from "../hooks/use-header-filter";

export interface HeaderFilterProps {
  title: string;
  property: string;
  filter: ColumnFilter;
  /** What is chosen of a list of values. */
  values: string[];
  /** What is searched for in a text column. */
  text: string;
  /** The column's new choice: the values, or the text. */
  change: (next: string[] | string) => void;
}

export function HeaderFilter({ title, property, filter, values, text, change }: HeaderFilterProps) {
  const view = useHeaderFilter(filter, values, text, change);
  return (
    <div className="ww-table__header">
      <span data-testid="table-column-title">{title}</span>
      <div
        className="ww-table__filter"
        data-testid="table-filter"
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
            onChange={change}
          />
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
    </div>
  );
}
