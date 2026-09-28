# @wirework/schema

The contracts and model types every other Wirework package is written
against, plus the shared path rules. Depends on zod only.

- **Contracts**: `defineContract` for a widget kind (input ports, events,
  settings, a preview); the `Store`, `ReadableStore` and `EventBus`
  interfaces; `ActionDefinition`; `LayoutEngine`.
- **Models**: `ViewModels` (pages, widget templates, page-level reactions)
  and `UserViewModels` (a user's overlay: template choice, settings, layout).
- **Paths**: `getPath`, `setPath`, `deletePath` and the rules for what a
  store path may be; `settingFields` turns a settings schema into form fields.
