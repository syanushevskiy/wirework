# @wirework/engine

The framework-free core of Wirework: registries, page resolution, boot
validation, reactions, tree editing. Depends on `@wirework/schema` (and
`zod`); knows nothing about React or any layout engine's template shape.

## Registries

`createRegistry({ contracts? })` (widgets), `createContracts()`,
`createActions()`, `createLayoutEngines()` — each with `register`, `get`,
`keys`, `list`, and `seal()` once boot is over (a later registration
throws). A definition that breaks the registry's invariants throws a
`RegistrationError` whose message names the registry and the key; a widget claiming a
contract `kind` is checked against that contract, and the message names
the departing port or event. `layoutEngineProblems` is the conformance
check a layout-engine test runs.

## Resolution

`resolvePage(input: ResolveInput): ResolvedPage` turns view models plus a
user's overlay into the plan a renderer draws: the engine, its validated
template, `ResolvedCell`s and warnings, or a page problem; every cell is a
`ResolvedCellOk` or carries a typed `CellProblem`, and an engaged fallback
is reported. `resolveTemplate` (a `TemplateResolution`) validates one page
template with its engine.

## Validation

`validateViewModels(input)` walks every template of both trees at boot and
reports each problem with its location and severity. `problemText`,
`errorText` and `issuesText` turn thrown values and validator issues into
sentences.

## Events and reactions

`createEmitter` (a cell-scoped, validating `emit`: an undeclared name or a
refused payload throws), `bindReactions` / `bindCellReactions` (a page's or
one cell's declared reactions on the bus), `emitPageLoad` (the page has
opened), `readableStore` (the read side a widget receives).

## Trees and paths

`pageTemplates`, `updatePageTemplate`, `updateWidgetTemplate`,
`updateUserPageTemplate`, `updateUserCellSettings`, `removeUserCell` — pure
edits of the trees; `suggestedInputPaths`, `boundPaths`,
`compatibleStorePaths` — the store paths a builder proposes, holds and
offers.
