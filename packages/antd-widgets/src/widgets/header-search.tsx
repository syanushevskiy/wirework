/**
 * The search box a TEXT filter opens from a column header (both tables,
 * use-table-headers.ts): one input, Search and Reset — the standard antd
 * "custom filter panel". Render-only: logic in useHeaderSearch.
 */
import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Space } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import { useHeaderSearch } from "../hooks/use-header-search";

export function HeaderSearch({ title, ...dropdown }: FilterDropdownProps & { title: string }) {
  const { inputRef, text, type, search, reset } = useHeaderSearch(dropdown);
  return (
    <div className="ww-table__search" data-testid="header-search" data-column={title}>
      <Input
        ref={inputRef}
        aria-label={`Search ${title}`}
        placeholder={`Search ${title}`}
        value={text}
        onChange={(event) => type(event.target.value)}
        onPressEnter={search}
        allowClear
      />
      <Space>
        <Button type="primary" size="small" icon={<SearchOutlined />} onClick={search}>
          Search
        </Button>
        <Button size="small" onClick={reset}>
          Reset
        </Button>
      </Space>
    </div>
  );
}
