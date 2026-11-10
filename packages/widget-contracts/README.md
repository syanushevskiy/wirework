# @wirework/widget-contracts

The standard Wirework widget kinds as contracts — declarations without
components. A UI library implements them (`@wirework/antd-widgets`); an
application defines its own kinds the same way with `defineContract` and
registers them next to these. Depends on `@wirework/schema` and `zod`.

## The kinds

`standardContracts` registers them all; each is also exported with what it
declares:

- `labelContract` (`LABEL_TONES`, `LabelTone`), `tagContract` (`TAG_TONES`,
  `TagTone`), `alertContract` (`ALERT_TONES`, `AlertTone`),
  `progressContract` (`PROGRESS_TONES`, `ProgressTone`) — display.
- `buttonContract` (`BUTTON_VARIANTS`, `ButtonVariant`: `primary`,
  `secondary`, `dashed`, `danger` — how much it stands out),
  `checkboxContract`, `switchContract`, `inputContract`
  (`INPUT_TYPES`, `VALIDATION_RULES`, `ValidationRule`), `selectContract`,
  `multiSelectContract` and `radioGroupContract` (`choiceOptionSchema`,
  `choiceOptionsSchema`, `ChoiceOption`), `sliderContract`, `rateContract`
  — controls whose state lives in the store and reaches it through a
  reaction: their `changed` writes back to the port it changes by default
  (`writesBack`), so a template binds the port and adds only what should
  follow.
- `statisticContract` (one number, large, with its title) and
  `dividerContract` (`DIVIDER_ORIENTATIONS`, `DividerOrientation`) —
  display, like the first group.
- The dashboard set (doc/more-widgets-design.md): `numberContract` (a
  number, `null` while the field is empty — never 0), `dateContract`
  (`DATE_PICKERS`, `DatePicker`, `DATE_FORMAT`: a day as the text
  `YYYY-MM-DD`, or ISO with the time; `format` is only what is SHOWN) and
  `dateRangeContract` (`dateRangeSchema`, `DateRange`, `NO_DATES`: a pair
  of such texts; bound to `<view>.filterBetween.<column>` it filters a
  server-described table with no other wiring) — controls like the second
  group, storing JSON and never a Date; `stepsContract` (`stepItemSchema`,
  `StepItem`, `STEPS_DIRECTIONS`: a pipeline with a current step by key or
  position, clickable on request) — a control too; `descriptionsContract`
  (`descriptionItemSchema`, `descriptionRecordSchema`, `DescriptionItem`,
  `DescriptionRecord`, `DESCRIPTIONS_SIZES`: one record as labelled fields
  in the TABLE's cell kinds — its items are the table's columns without a
  filter and sorting — a link cell emitting `link-clicked`),
  `resultContract` (`RESULT_STATUSES`, `ResultStatus`: an outcome with one
  action emitting `clicked`) and `timelineContract` (`timelineItemSchema`,
  `timelineItemsSchema`, `TimelineItem`, `TIMELINE_MODES`: a history as
  data at a port) — display with an intent. Two settings came with them:
  `input.rows` (a long text is the same field with more lines) and
  `button.confirm` (a question before the click counts).
- `cardContract` (`CARD_SIZES`, `CardSize`), `tabsContract`
  (`layoutItemSchema`, `LayoutItem`), `collapseContract` and
  `dialogContract` (`DIALOG_KINDS`, `DRAWER_PLACEMENTS`: a modal or a
  drawer open while its `open` port is true, closing written back) —
  CONTAINERS (doc/containers-design.md): a layout of other widgets inside,
  held in the widget's own template (a card's `content`; a `content` per
  tab or panel) and declared with `contains`, so the adapter renders it,
  boot validation walks into it and a builder edits it where it edits a
  page. The first three bind and emit nothing: the widgets inside do that;
  the dialog is the first container with a port.
- `paginationContract` (`PAGINATION_SIZES`, `PaginationSize`),
  `refresherContract` (`refreshScheduleSchema`, `RefreshSchedule`,
  `REFRESH_INTERVAL`, `REFRESH_TRIGGERS`, `RefreshTrigger`) — the page's
  navigation and refresh, as intents.
- `tableContract` (`tableColumnSchema`, `tableRowsSchema`, `TableColumn`,
  `TableRow`) and `filterBarContract` (`filterDefinitionSchema`,
  `filterValuesSchema`, `FilterDefinition`, `FilterValues`) — a table and
  the filters a server describes.

## Table cells

`tableCellSchema` (`TableCell`, `TableCellKind`: `text`, `tag`, `link`,
`custom`) is how a column says what its value shows; `appPathSchema` an
address of the application a link may carry; `cellText`, `cellTone` and
`cellHref` the pure helpers every table implementation shares.
