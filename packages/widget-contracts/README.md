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
- `buttonContract`, `checkboxContract`, `inputContract` (`INPUT_TYPES`,
  `VALIDATION_RULES`, `ValidationRule`), `selectContract` and
  `multiSelectContract` (`choiceOptionSchema`, `choiceOptionsSchema`,
  `ChoiceOption`) — controls whose state lives in the store and reaches it
  through a reaction.
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
