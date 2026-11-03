# @wirework/engine

The framework-free core of Wirework: registries, page resolution, boot
validation, reactions, tree editing. Depends on `@wirework/schema` (and
`zod`); knows nothing about React or any layout engine's template shape.

## Registries

`createRegistry({ contracts? })` (widgets), `createContracts()`,
`createActions()`, `createLayoutEngines()`, `createPredicates()` — each
with `register`, `get`, `keys`, `list`, and `seal()` once boot is over (a
later registration throws). A definition that breaks the registry's invariants throws a
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
reports each problem with its location and severity — and into every layout
a container holds (`… (#card-1) content cell[0] (#inner)`), refusing one
nested deeper than `MAX_LAYOUT_DEPTH`. `problemText`, `errorText` and
`issuesText` turn thrown values and validator issues into sentences.

## Appearances

How a conditional widget appears and disappears (`appear` / `disappear`,
doc/conditions-design.md "Appearance") is a NAME from the sixth registry:
`createAppearances()` starts with the standard five (`standardAppearances`)
and takes the host's own (`{ name, description }`, the name kebab-case, the
animation itself `@keyframes ww-<name>` in the host's stylesheet);
`STANDARD_APPEARANCES` is the standard set alone, sealed.
`appearanceProblems(viewModel, appearances?)` reports a name nobody
registered — part of `contractProblems`, given `ResolveInput.appearances`.

## Layouts inside widgets

doc/containers-design.md: a container's template holds a page template in
a setting its definition names in `contains`. `layoutsOf(definition,
viewModel)` lists the layouts held (`{ path, template }` — `content`, or
`tabs.0.content` for an item of a list); `innerCellKey` and `innerOverlay`
give the overlay as the cells inside see it (`card-1/button`);
`chainSteps(at)` reads a chain of containers; `layoutPathAt(layoutEngines,
viewModels, page, at)` finds where such a layout lives in the view models;
`cellsWithin(registry, layoutEngines, viewModels, template)` lists a
layout's cells, the ones inside its containers included. The registry
refuses a `contains` naming a setting the widget does not have.

## Events and reactions

`createEmitter` (a cell-scoped, validating `emit`: an undeclared name or a
refused payload throws), `bindReactions` / `bindCellReactions` (a page's or
one cell's declared reactions on the bus), `withDefaultReactions` /
`defaultReaction` / `sameReaction` (the write-back an event does by
default, in place first under its event — what `checkTemplate` applies to
every resolved view model), `emitPageLoad` (the page has opened),
`readableStore` (the read side a widget receives).

## Conditions

A widget's `when` (doc/conditions-design.md) names predicates from the
fifth registry: `createPredicates()` starts with the standard eight and
takes the host's own (`runs/retryable`), checked like every registration
(a name in the action grammar, a `test`, a `phrase`, a `description`, an
`argument` that validates); `STANDARD_PREDICATES` is the standard set
alone, sealed, what every function here uses when no registry is given.
`holds(when, read, predicates?)` evaluates a condition against whatever
`read` gives at a path, `whenPaths` lists what it reads, `testText` /
`whenText` are its one wording ("unless run.error is empty"), and
`whenProblems` what resolve and boot validation report (an unknown
predicate, a literal it refuses, takes none of or lacks) — part of
`contractProblems`, given `ResolveInput.predicates`. A member written in
words (`{ expression }`, the constructor: `and`, `or`, `not`, parentheses
over `path phrase value` leaves) is parsed once per registry and text
(`parsedExpression`, `ConditionNode`, `ParsedExpression`); one that cannot
be read is a problem with the reason, and never holds.

## Trees and paths

`pageTemplates`, `updatePageTemplate`, `updateWidgetTemplate`,
`updateUserPageTemplate`, `updateUserCellSettings`, `removeUserCell` — pure
edits of the trees; `suggestedInputPaths`, `boundPaths`,
`compatibleStorePaths` — the store paths a builder proposes, holds and
offers.
