# @wirework/schema

The contracts and model types every other Wirework package is written
against, plus the shared path rules. Depends on zod only.

## Contracts

- **Widgets**: `WidgetDefinition` / `AnyWidgetDefinition` (the registration
  envelope), `WidgetProps` (what a component receives), `WidgetPreviewSpec`,
  `Validator` (the structural validator zod satisfies).
- **Ports**: `WidgetIO`, `PortDefinition`, `IoBindings`, `ioBindingsSchema`,
  `storePathSchema` / `StorePath`, `NO_IO`.
- **Events**: `WidgetEvents`, `EventDefinition`, `Emit`, `EventPayload`,
  `WidgetEvent`, `EventSource`, `EventFilter`, `EventListener`, `EventBus`,
  `eventFilter`, `NO_EVENTS`.
- **Reactions**: `reactionSchema` (`setReactionSchema` / `SetReaction`,
  `callReactionSchema` / `CallReaction`), `Reaction`, `EventBindings`,
  `reactionsByEventSchema`, `eventBindingsSchema`, `widgetBindingsSchema`
  (ports + reactions in one go), `WidgetBindings`.
- **Conditions** (doc/conditions-design.md): `whenSchema` / `When`
  (`whenTestSchema` / `WhenTest`, `whenAnySchema` / `WhenAny`,
  `whenExpressionSchema` / `WhenExpression` — the constructor, a condition
  in words —, `WhenMember`) — the `when` section of a view model, a list
  of members that must all hold; `PredicateDefinition` /
  `AnyPredicateDefinition` (a named, pure check with its `phrase`,
  `description` and `argument`); `standardPredicates` — the eight every
  registry starts with (`empty`, `true`, `false`, `equal`, `one-of`,
  `contains`, `greater`, `less`); `appearSchema` / `Appearance` (a
  kebab-case name, `APPEARANCE_NAME`) for the `appear` and `disappear`
  sections, `AppearanceDefinition` and `standardAppearances` — the five
  every appearance registry starts with (`APPEARANCES` their names).
- **Page events**: `pageEvents`, `PageEventName`, `pageBindingsSchema` /
  `PageBindings` (derived from the declaration), `PAGE_EVENT_WIDGET`,
  `pageEventSource`.
- **Kinds**: `defineContract`, `WidgetContractInput`, `SettingsSchema`,
  `WidgetContract` / `AnyWidgetContract`, `ContractViewModel`,
  `ContractProps`.
- **Actions**: `ActionDefinition`, `ActionContext`.
- **Layout engines**: `LayoutEngine` / `AnyLayoutEngine`.
- **Stores**: `Store`, `ReadableStore`, `Unsubscribe`.
- **Settings introspection**: `settingFields` (`SettingField`,
  `SettingKind` — the primitives, `items` for a named list of entries with
  a `key` and a `label` such as tabs, `json` on request), `argumentKind` (`ArgumentKind`: what a builder shows for
  one value a validator describes), `validatorKeys`,
  `RESERVED_VIEW_MODEL_KEYS` (`inputs`, `on`, `when`).

## Models

- `ViewModels` / `viewModelsSchema` — pages (`PageViewModel`,
  `pageViewModelSchema`, `Templates`), widget templates, page-level
  reactions and `roles` (doc/roles-design.md): what a ROLE's pages are, in
  the user overlay's shape, keyed by role name (`ROLE_NAME`); `CellBase` /
  `cellBaseSchema` is what every layout engine's cell carries.
- `UserViewModels` / `userViewModelsSchema` — a user's overlay (and a
  role's entry): `PageUserViewModel` (template choice, own templates, cells)
  and `WidgetUserViewModel` (template choice, settings), every level strict.
- `PageFile` / `pageFileSchema` — one page as a file (doc/pages-as-code-design.md):
  its templates, `on`, the widgets its cells reference, its `route`, and
  `roles` — what every role says about the page.

## Names and paths

- `KEBAB_NAME`, `ACTION_NAME`, `PREDICATE_NAME`, `PATH_SEGMENT`,
  `STORE_PATH`, `FORBIDDEN_SEGMENTS`, `CONFIG_ROOTS`, `isConfigPath`,
  `hasForbiddenSegment` — the one grammar for identities and paths.
- `getPath`, `setPath`, `deletePath` (`PathInput`), `pathSegments`,
  `checkedSegments`, `isIndexSegment`, `isPlainObject` — the one walker of
  plain data trees: reads see own properties only, writes clone along the
  path, and a write through anything that is not a plain object or a list
  throws; `valueText` — the one text of a value (nothing for null and
  undefined, JSON for an object or a list), for a table cell, a tag's tone
  and the text predicates alike.
