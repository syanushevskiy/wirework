/**
 * The COLUMN MENU of the two antd tables (`columnMenu` in the `table`
 * contract): the "Columns" button in the toolbar above the table
 * (TableToolbar) opening a list of every column — a checkbox to show or hide
 * it (locked, with an "Always" tag, for a REQUIRED column), a handle to drag
 * it to another place, and three dots that open its actions: Pin left, Pin
 * right, and Unpin for a pinned one — under a "Columns" checkbox for all of
 * them and Reset, which brings the columns back as configured.
 *
 * The list is in SECTIONS, as the table stands: PINNED LEFT, COLUMNS, PINNED
 * RIGHT, each under its caption — the two pinned ones only while a column
 * is pinned to that edge. Render-only: logic in useColumnState.
 */
import { HolderOutlined, LockOutlined, MoreOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Dropdown, Flex, Popover, Tag, Tree } from "antd";
import type { ColumnMenuItem, ColumnMenuSection, ColumnMenuView } from "../hooks/use-column-state";

export interface ColumnMenuProps {
  menu: ColumnMenuView;
}

/**
 * What the three dots of a line offer, by where the column stands: Pin left
 * and Pin right for one that is not pinned; for a pinned one Unpin, and the
 * pin to the OTHER edge.
 */
const UNPIN = { key: "none", label: "Unpin" };
const PIN_LEFT = { key: "left", label: "Pin left" };
const PIN_RIGHT = { key: "right", label: "Pin right" };
const ACTIONS = {
  none: [PIN_LEFT, PIN_RIGHT],
  left: [UNPIN, PIN_RIGHT],
  right: [UNPIN, PIN_LEFT],
};

interface ColumnLineProps {
  item: ColumnMenuItem;
  menu: ColumnMenuView;
}

function ColumnLine({ item, menu }: ColumnLineProps) {
  const at = item.pin ?? "none";
  return (
    <span
      className="ww-table__column-item"
      data-testid="table-column-item"
      data-property={item.property}
      data-title={item.title}
      data-shown={item.shown}
      data-required={item.required}
      data-pinned={at}
    >
      <Checkbox
        checked={item.shown}
        disabled={item.required}
        onChange={(event) => menu.toggle(item.property, event.target.checked)}
      >
        {item.title}
      </Checkbox>
      {item.required ? (
        <Tag icon={<LockOutlined />} className="ww-table__column-always" data-testid="table-column-required">
          Always
        </Tag>
      ) : null}
      <Dropdown
        // A new place is a new menu: the one an action was chosen in does not stay open over the line as it moves.
        key={at}
        // The pointer over the dots opens them; a press does too, where nothing hovers.
        trigger={["hover", "click"]}
        placement="bottomRight"
        menu={{
          items: ACTIONS[at],
          onClick: ({ key }) => menu.pin(item.property, key === "left" || key === "right" ? key : undefined),
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          className="ww-table__column-actions"
          aria-label={`Actions of ${item.title}`}
          data-testid="table-column-actions"
        />
      </Dropdown>
    </span>
  );
}

/** The caption over a section: its own line of the list, which is neither dragged nor dropped beside. */
function SectionCaption({ section }: { section: ColumnMenuSection }) {
  return (
    <span
      className="ww-table__column-section"
      data-testid="table-column-section"
      data-section={section.edge ?? "columns"}
    >
      {section.title}
    </span>
  );
}

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
            draggable={{ icon: <HolderOutlined />, nodeDraggable: (node) => menu.draggable(String(node.key)) }}
            allowDrop={menu.allowDrop}
            onDrop={menu.drop}
            treeData={menu.sections.flatMap((section) => [
              { key: section.key, title: <SectionCaption section={section} /> },
              ...section.items.map((item) => ({
                key: item.property,
                title: <ColumnLine item={item} menu={menu} />,
              })),
            ])}
          />
        </div>
      }
    >
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        // The icon has a name of its own ("setting"); the button's is its text alone.
        aria-label="Columns"
        data-testid="table-column-menu"
        data-changed={menu.changed}
      >
        Columns
      </Button>
    </Popover>
  );
}
