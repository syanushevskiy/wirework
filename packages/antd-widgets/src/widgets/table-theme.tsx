/**
 * The TEXT SIZE of the two antd tables: 12px where antd's default is 14 —
 * the cells, the headers, and every control of the table (the bar's filters
 * and tools, the column menu, the header dropdowns, the cell menu; antd's
 * popups keep the theme of where they were opened). Laid over the host's own
 * theme, which keeps everything else it says. The table's title stays 16px
 * (styles.css).
 */
import type { ReactNode } from "react";
import { ConfigProvider, type ThemeConfig } from "antd";

/**
 * The small size too: antd would derive 10px from a base of 12, and a tag in a cell is set in it — with the line
 * height that goes with 12px (20px), so a row with a tag is a whole number of pixels high (the row window counts on it).
 */
const TABLE_THEME: ThemeConfig = { token: { fontSize: 12, fontSizeSM: 12, lineHeightSM: 20 / 12 } };

export function TableTheme({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={TABLE_THEME}>{children}</ConfigProvider>;
}
