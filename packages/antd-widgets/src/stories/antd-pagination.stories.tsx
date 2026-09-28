import type { Meta, StoryObj } from "@storybook/react-vite";
import { antdPagination } from "../widgets/antd-pagination";
import { paginationConformance } from "./conformance";
import { playground } from "./playground";

const meta = { title: "Widgets/antd-pagination" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Page, page size and total are DATA: change `total` and the pager grows;
 * click a page and the `page` control follows (the reaction stored it).
 */
export const Playground: Story = playground(antdPagination);

// The `pagination` contract's conformance set.
const conformance = paginationConformance(antdPagination);
export const Pages: Story = conformance.Pages;
export const PageSizeFromStore: Story = conformance.PageSizeFromStore;
export const BoundToEmptyPath: Story = conformance.BoundToEmptyPath;
