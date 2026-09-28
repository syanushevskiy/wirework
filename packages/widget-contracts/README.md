# @wirework/widget-contracts

The standard Wirework widget kinds as contracts — declarations without
components: label, button, input, pagination, refresher, select,
multi-select, tag, checkbox, progress, alert, table and filter-bar.
`standardContracts` registers them all. A UI library implements them
(`@wirework/antd-widgets`); an application defines its own kinds the same
way with `defineContract`.

Also here: the table cell kinds (`text`, `tag`, `link`, `custom`) and the
pure helpers every table implementation shares.
