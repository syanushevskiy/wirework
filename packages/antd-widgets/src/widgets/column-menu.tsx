/**
 * The COLUMN MENU of the two antd tables (`columnMenu` in the `table`
 * contract): a settings button in the toolbar above the table (TableToolbar) opening a list of every
 * column — a checkbox to show or hide it, a handle to drag it to another
 * place — under a "Columns" checkbox for all of them and Reset, which
 * brings the columns back as configured. Render-only: logic in
 * useColumnState.
 */
import { HolderOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Flex, Popover, Tree } from "antd";
import type { ColumnMenuView } from "../hooks/use-column-state";

export interface ColumnMenuProps {
  menu: ColumnMenuView;
}

const DRAG = { icon: <HolderOutlined />, nodeDraggable: () => true };

export function ColumnMenu({ menu }: ColumnMenuProps) {
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      title={
        <Flex justify="space-between" align="center" gap="large">
          <Checkbox
            checked={menu.all}
            indeterminate={menu.some}
            onChange={(event) => menu.toggleAll(event.target.checked)}
          >
            Columns
          </Checkbox>
          <Button
            type="link"
            size="small"
            disabled={!menu.changed}
            onClick={menu.reset}
            data-testid="table-column-reset"
          >
            Reset
          </Button>
        </Flex>
      }
      content={
        <div className="ww-table__column-list" data-testid="table-column-list">
          <Tree
            blockNode
            selectable={false}
            draggable={DRAG}
            allowDrop={menu.allowDrop}
            onDrop={menu.drop}
            treeData={menu.items.map((item) => ({
              key: item.property,
              title: (
                <span data-testid="table-column-item" data-property={item.property} data-shown={item.shown}>
                  <Checkbox checked={item.shown} onChange={(event) => menu.toggle(item.property, event.target.checked)}>
                    {item.title}
                  </Checkbox>
                </span>
              ),
            }))}
          />
        </div>
      }
    >
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        aria-label="Column settings"
        data-testid="table-column-menu"
        data-changed={menu.changed}
      />
    </Popover>
  );
}
