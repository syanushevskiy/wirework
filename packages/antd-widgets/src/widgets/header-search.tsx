/**
 * The search box a TEXT filter opens from a column header (both tables,
 * use-table-headers.ts): one input over Reset and Done, as the list of
 * values has them. The table is searched as the text is typed; Done only
 * closes. Render-only: logic in useHeaderSearch.
 */
import { Button, Input, Space } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import { useHeaderSearch } from "../hooks/use-header-search";

export function HeaderSearch({ title, ...dropdown }: FilterDropdownProps & { title: string }) {
  const { inputRef, text, type, search, reset, done } = useHeaderSearch(dropdown);
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
        <Button size="small" disabled={text === ""} onClick={reset}>
          Reset
        </Button>
        <Button type="primary" size="small" onClick={done}>
          Done
        </Button>
      </Space>
    </div>
  );
}
