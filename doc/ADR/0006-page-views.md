# ADR-0006: Page views — the team's prebuilt layouts and the user's own, chosen from a list, shared as JSON

- **Status:** Accepted — built
- **Deciders:** the product owner

## 1. Decision

A VIEW is a page template. Its kind — prebuilt or the user's own — is WHERE
it lives in the trees, never a stored flag. One labelled list chooses a view
(no permission needed); Save as, Rename, Delete and Import need `editPages`
and write where the edit target says. A view is shared as a versioned JSON
file. A view also holds the layouts inside its containers. All built; not
built: a view FILE that carries those inner layouts.

## 2. Problem

A page has one layout the team built, and a user may rearrange it for
themselves. A host embedding Wirework needs more: the page's default view
plus any number of prebuilt alternatives; any number of user views; one list
to choose from that says which is which; and a view as a JSON file a user
can save, send and import, with the application deciding where files go.

The user picks a view in one click, sees at a glance whether it is prebuilt
or their own, and shares one by pasting text to a colleague. Keeping views
across reloads is another story (WW-19); sharing does not wait for it.

The data model already holds several named templates and a selection
(`templates` and `view`). What this record adds is the controls and a file.

## 3. Details

### What a view is

| Kind   | Lives at                                       | Who writes it                                   | Shown in the list as |
| ------ | ---------------------------------------------- | ----------------------------------------------- | -------------------- |
| `base` | `viewModels.pages.<page>.<name>`               | configuration; the builder with the overlay OFF | _prebuilt_           |
| `user` | `userViewModels.pages.<page>.templates.<name>` | the user, with the overlay ON                   | _mine_               |

The page shows the view named by `userViewModels.pages.<page>.view`, else
`default` — the fallback `resolvePage` has. There is no `kind` field in the
data.

A user template with a base template's name SHADOWS it (`pageTemplates`:
same name, the user's wins). So a name a prebuilt view has is refused for a
user view, and the other way round.

### The controls

- **Choosing** a view writes the overlay's `view`. It needs no permission:
  it is a preference.
- **Save as, Rename, Delete, Share, Import** open a panel above the page
  (for the name or the JSON). Creating, renaming, deleting and importing
  need `editPages`, like Edit page.
- **Writes follow the edit target** the toolbar shows: with the overlay on,
  Save as and Import make a user view; with it off, a prebuilt one.
- The host's `save` is the one persistence seam.

### Where edits go

With the overlay on, a page-template op edits what the user SEES. A user
view is edited in place. A prebuilt view is copied first: the copy is named
"my-own" — or the first free "my-own-2", "my-own-3", … — and selected as the
view. With the overlay off, ops rewrite the base template.

### The file

```json
{
  "kind": "wirework-page-view",
  "version": 1,
  "page": "settings",
  "name": "compact",
  "template": { "engine": "react-grid-layout", "cells": [ … ] }
}
```

The file is versioned and carries its own kind marker, so a pasted widget
template or other JSON is refused by shape. `exportPageView` writes it.
`parsePageViewFile` reads it back and reports one of: not a view file
(unparsable, wrong kind or version, missing fields); for another page; a
template the registered engine refuses (the engine's own validator); a name
that is empty, contains a dot or is taken. The name may be given on import,
overriding the file's.

The file carries the page's layout only.

### A view holds the layouts inside its containers

One view is the page's layout AND the layouts inside its cards.

- The overlay's page entry holds `viewCells.<view>.<cell key>` — a cell
  entry as in `cells`, read ON TOP of `cells` while that view shows
  (`viewLayers`, engine `layers.ts`). The projection has the overlays' own
  shape, so resolution, the layouts inside containers (`innerOverlays`) and
  validation read it unchanged. `resolvePage` and `PageView` project by the
  plan's view, validation by each template's name, the builder by the
  page's shown view (`shownView` / `shownLayers`). A `viewCells` entry for a
  view nobody has is a warning.
- An edit inside a container, made in an overlay's view, lands in the
  overlay's OWN view of the page, as a page edit does. A prebuilt view is
  copied first ("my-own", or a role's own name), and what the layers hold
  for the shown view comes along (`foldViewCells`). The layout is written as
  the container's setting for that view (`updateUserLayoutAt`), e.g.
  `viewCells["my-own"]["card-profile"].settings.default.content`.
- Rename and Delete move and drop the view's `viewCells` with it.
- Save as copies what is ON SCREEN (`usePageViews`' `shownTrees`: the
  session's trees with its pending ops replayed) — the template and the
  view's cells — into the new view only. The editing session then ends.
- The views row names the PAGE's view also from inside a container
  (`usePageEditing().pageView`; the nested plan has a view of its own).
- "Reset to original" (`cell-reset-layout`) is in the chrome of every
  container in a user's or a role's view. `resetLayoutOp` drops the
  overlay's own layouts inside it (the shown view's, and any held for every
  view). It is a pending change like any other, and is disabled where the
  overlay holds nothing of its own (`ownLayoutCells`).

What stays outside a view:

- The settings of the widgets INSIDE a card stay per user
  (`cells["card-1/button"]`), as every cell's settings do.
- A prebuilt view has no layouts of its own inside cards: on the shared page
  the layout is the card's widget template, the same in every prebuilt view.

### Packages

- `@wirework/engine` (`trees.ts`), all pure: `putPageTemplate`,
  `putUserPageTemplate` (writes and selects), `selectUserPageView`,
  `renameUserPageTemplate`, `removeUserPageTemplate` (unselects when it was
  the view).
- `@wirework/builder`: `pageViews(trees, page)` (the list, one pass over the
  two trees), `freeTemplateName`, `templateNameProblem` (returns the first
  problem), the file format, the `ViewProblem` and `ViewsLock` codes,
  `usePageViews` (list, selection, the five actions, the panel's state) and
  the routing in `usePageEditing`.
- `@wirework/antd-builder`: `PageViews` — a Select grouped into _Prebuilt_
  and _Mine_, the five buttons, and the panel. Problems and locks are codes;
  their words are `DEFAULT_PAGE_VIEW_TEXTS`.
- The playground composes them in `use-playground.ts`.

Every control is reachable from a test: the list's options carry the view's
NAME as their title, the shown view's kind is a `data-kind` fact, every
refusal is text under one test id.

Tested by `e2e/features/page-views.feature`, `trees.test.ts`,
`page-views.test.ts`, `use-page-views.test.tsx`,
`use-page-editing.test.tsx`, `page-views.test.tsx` and
`page-views.stories.tsx`.

### Not built

- A view FILE that carries the layouts inside its containers.
- A view that carries its cells' other settings.
- Promoting a user view to prebuilt in one click (today: Share, turn the
  overlay off, Import).

## 4. Options weighed

The data model was not in question. The choices were about what is added
around it.

| Question                       | Options                                                                      | Chosen, and why                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Where the views are kept       | A new `views` structure, or the templates resolve already reads              | The existing templates: nothing new to invent.                                                                                                 |
| How a view's kind is known     | A stored `kind` field, or the place it lives                                 | The place: a kind derived from the tree cannot lie, and a file cannot claim to be prebuilt.                                                    |
| What a view carries            | The layout alone, or also a per-view overlay of the author's widget settings | The layout, plus the layouts inside containers. Per-view widget settings would change resolve, validation and the editor for a secondary need. |
| How a view is shared           | The clipboard only, or the JSON in a text box with Copy as a convenience     | The text box: the user can read it and paste from it.                                                                                          |
| Where the controls open        | A modal dialog, or a panel                                                   | A panel above the page, as the widget editor has: nothing floats over the page.                                                                |
| Who may create a prebuilt view | Configuration only, or the same controls                                     | The same controls, by the edit target: otherwise the default view is a fixture nobody can create.                                              |

Two limits are accepted:

- A shared view carries the LAYOUT only. Cell settings are keyed by page,
  not by view, so a shared view loses the author's widget tweaks.
- A shared file names the page's widgets and models. On a page changed
  since, those cells show as problems: resolve reports them loudly and
  nothing is dropped.
