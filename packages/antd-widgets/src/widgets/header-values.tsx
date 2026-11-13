/**
 * The list of VALUES a column's filter opens from its header (both tables,
 * use-table-headers.ts): a Select of several values — searched by label,
 * cleared with its clear button, every chosen value a tag, as many lines of
 * them as it takes — over Reset and Done. A pick filters at once; Done only
 * closes. Render-only: logic in useHeaderValues.
 */
import { Button, Select, Space } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import type { ChoiceOption } from "@wirework/widget-contracts";
import { useHeaderValues } from "../hooks/use-header-values";

export function HeaderValues({
  title,
  options,
  ...dropdown
}: FilterDropdownProps & { title: string; options: ChoiceOption[] }) {
  const view = useHeaderValues(dropdown, options);
  return (
    <div
      className="ww-table__dropdown ww-table__values"
      data-testid="header-values"
      data-column={title}
      data-options={view.offeredAttribute}
      data-values={view.chosenAttribute}
      role="group"
      aria-label={`Values of ${title}`}
    >
      <Select
        mode="multiple"
        className="ww-select"
        aria-label={`Filter ${title}`}
        placeholder="All"
        allowClear
        showSearch
        optionFilterProp="label"
        value={view.values}
        options={view.options}
        onChange={view.pick}
      />
      <Space>
        <Button size="small" disabled={view.values.length === 0} onClick={view.reset}>
          Reset
        </Button>
        <Button type="primary" size="small" onClick={view.done}>
          Done
        </Button>
      </Space>
    </div>
  );
}
