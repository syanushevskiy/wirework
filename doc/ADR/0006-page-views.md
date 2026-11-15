# ADR-0006: Page views — the team's prebuilt layouts and the user's own, chosen from a list, shared as JSON

- **Status:** Accepted — built
- **Date:** 2026-10-24
- **Deciders:** the product owner

## Description

A page has one layout the team built, and every user may have rearranged it
for themselves — today into exactly one copy, named "my-own", with no way to
pick between layouts, keep several, or hand one to a colleague. A third
party embedding Wirework needs: the page's DEFAULT (admin) view plus any
number of prebuilt alternatives; any number of user views; one list to
choose from that says which is which; and a view as a JSON file a user can
save, send and import, with the application deciding where the files go.

What is asked of the product: a user picks a view in one click, sees at a
glance whether it is prebuilt or their own, and shares one by pasting text
to a colleague. Keeping views across reloads is another story (WW-19), and
the sharing must not wait for it.

Designed 2026-10-24. Status: **built** (see "Tested").

## What a view is

A VIEW is a page template as the user sees it, and its kind is WHERE it
lives — never a flag stored in the data:

| Kind   | Lives at                                       | Who writes it                                   | Shown in the list as |
| ------ | ---------------------------------------------- | ----------------------------------------------- | -------------------- |
| `base` | `viewModels.pages.<page>.<name>`               | configuration; the builder with the overlay OFF | _prebuilt_           |
| `user` | `userViewModels.pages.<page>.templates.<name>` | the user, with the overlay ON                   | _mine_               |

The page shows the one named by `userViewModels.pages.<page>.view`, else
`default` — exactly the fallback `resolvePage` already had. Nothing new is
stored: the data model (`templates` + `view`) already held several named
templates and a selection; what was missing was the controls and a file.

## Options considered

The data model was not in question — `templates` and `view` were there.
The choices were about what is added around them.

- **Where the views are kept.** A new `views` structure beside
  `templates`, or the templates resolve already reads. Nothing new was
  invented: the existing structure was kept.
- **How a view's kind is known.** A `kind` field stored in the data and
  in the file, or the kind derived from where the view lives. A field was
  rejected: a kind derived from the tree cannot lie, and a file cannot
  claim to be prebuilt.
- **What a view carries.** The layout alone, or also a per-view `cells`
  overlay with the author's widget settings. The per-view overlay was
  rejected: a schema change through resolve, validation, the editor and
  every scenario, for a secondary need. Its cost is the first limit under
  "Consequences". (For the layouts inside containers it was built later:
  "A view holds the layouts inside its containers" below.)
- **How a view is shared.** The clipboard as the only path, or the JSON
  shown in a text box the user can read and paste from, with Copy as a
  convenience. The text box was chosen.
- **Where the controls open.** A modal dialog, or a panel. The dialog was
  rejected: the widget editor set the precedent — a panel above the page,
  nothing floats over it.
- **Who may create a prebuilt view.** Users' views only, the prebuilt
  ones left to configuration; or the same controls writing a prebuilt
  view. Without the admin side, "default (admin) template" is a fixture
  nobody can create — hence the target rule in the decision.

## Decision

Build the controls and the file over the data model as it is.

- A view's kind is WHERE it lives ("What a view is" above); no `kind`
  field in the data.
- The file is versioned and carries a kind marker of its own
  (`wirework-page-view`), so a pasted recipe or a widget template is
  refused by shape, not by accident ("The file" below).
- Writes follow the EDIT TARGET the toolbar already shows: with the
  overlay on, Save as and Import make a user view; with it off, a prebuilt
  one.
- Choosing a view needs no permission — it is a preference. Creating,
  renaming, deleting and importing need `editPages`, like Edit page.
- The host's `save` is the one persistence seam, unchanged.
- The first copy of a prebuilt view is named "my-own", the next ones are
  numbered ("my-own-2").
- A user template with a base template's name SHADOWS it
  (`pageTemplates`: same name, user wins). So a name a prebuilt view has
  is refused for a user view, and the other way round.
- One hook per component (`usePageViews` → `PageViews`); problems and
  locks are codes, their words live in the antd package. The list is one
  `flatMap` over the two trees; the checks of a name are one function
  returning the first problem.
- Every control is a Gherkin step: the list's options carry the view's
  NAME as their title, so a step picks by name; the shown view's kind is
  a `data-kind` fact; every refusal is text under one test id; import
  takes the JSON as a doc string. The pure tree functions and the file
  format are unit-tested, the hook with `renderHook`, and the component
  has a story and a jsdom test ("Tested" below).

## Consequences

Two limits were accepted:

- A view carries the LAYOUT only. The per-cell settings overlay is keyed
  by page, not by view, so a shared view loses the author's widget tweaks
  — named under "Follow-up" below.
- A shared file names the page's widgets and models. A page changed since
  shows those cells as problems: resolve already reports them loudly, and
  nothing is dropped.

## Where edits go (amends doc/ADR/0003-layout-engines.md)

With the overlay on, a page-template op edits what the user SEES: a user
view in place; a prebuilt view as a fresh copy named "my-own" — or the
first free "my-own-2", "my-own-3", … when that name is taken — selected as
the view. With the overlay off, ops rewrite the base template, as before.

## The file

```json
{
  "kind": "wirework-page-view",
  "version": 1,
  "page": "overview",
  "name": "compact",
  "template": { "engine": "react-grid-layout", "cells": [ … ] }
}
```

`exportPageView` writes it; `parsePageViewFile` reads it back and reports
one of: not a view file (unparsable, wrong kind or version, missing
fields), for another page, a template the registered engine refuses (the
engine's own validator), a name that is empty, contains a dot or is taken.
The name may be given on import, overriding the file's.

## Packages

- `@wirework/engine` (`trees.ts`): `putPageTemplate`, `putUserPageTemplate`
  (writes and selects), `selectUserPageView`, `renameUserPageTemplate`,
  `removeUserPageTemplate` (unselects when it was the view) — pure, like
  the rest of the file.
- `@wirework/builder`: `pageViews(trees, page)` (the list), `freeTemplateName`,
  `templateNameProblem`, the file format, `ViewProblem` and `ViewsLock`
  codes, `usePageViews` (list, selection, Save as / Rename / Delete / Share
  / Import, the panel's state) and the amended routing in `usePageEditing`.
- `@wirework/antd-builder`: `PageViews` — a Select grouped into _Prebuilt_
  and _Mine_, the five buttons, and a panel for the name or the JSON;
  `DEFAULT_PAGE_VIEW_TEXTS` for the kinds, locks and problems.
- The playground composes them in `use-playground.ts`; the overview page
  ships a second prebuilt view, `compact`.

## A view holds the layouts inside its containers (9 November 2026)

Reported by the product owner: with the overlay on, a card's content was
rearranged, "Save as" pressed — and the change was gone; saved first, it
showed in EVERY view and could not be chosen away. Two causes. Save as
copied the committed page and cancelled the session, so what was pending
was dropped. And a user's layout inside a card was a setting of the card
(`cells["card-1"].settings.default.content`): one per user, whichever view
showed. The owner's decision: one view is the page's layout AND the layouts
inside its cards, and every card can be reset to the original.

- The overlay's page entry holds `viewCells.<view>.<cell key>` — a cell
  entry as in `cells`, read ON TOP of `cells` while that view shows
  (`viewLayers`, engine `layers.ts`). The projection has the overlays' own
  shape, so resolution, the layouts inside containers (`innerOverlays`) and
  validation read it unchanged: `resolvePage` and `PageView` project by the
  plan's view, validation by each template's name (a `viewCells` entry for
  a view nobody has is a warning), the builder by the page's shown view
  (`shownView` / `shownLayers`).
- An edit inside a container in an overlay's view lands in the overlay's
  OWN view of the page, as a page edit does: a prebuilt view is copied
  first ("my-own", a role's own name) and what the layers hold for the
  shown view comes along (`foldViewCells`); the layout is written as the
  container's setting for that view (`updateUserLayoutAt`). Rename and
  Delete move and drop the view's `viewCells` with it.
- Save as copies what is ON SCREEN (`usePageViews`' `shownTrees`, the
  session's trees with its ops replayed): the template and the view's
  cells — into the new view only; the session still ends. The views row
  names the PAGE's view also from inside a container
  (`usePageEditing().pageView`; the nested plan has a view of its own).
- "Reset to original" (`cell-reset-layout`) is in the chrome of every
  container in a user's or a role's view: `resetLayoutOp` drops the
  overlay's own layouts inside it (the shown view's, and any held for every
  view), a pending change like any other; disabled where there is nothing
  of the overlay's own (`ownLayoutCells`).
- Not changed: the settings of the widgets INSIDE a card stay per user
  (`cells["card-1/button"]`), as every cell's settings do; a prebuilt view
  has no layouts of its own inside cards (on the shared page the layout is
  the card's widget template, the same in every prebuilt view); the view
  FILE (Share / Import) still carries the page's layout only.

## Follow-up (not built)

A view FILE that carries the layouts inside its containers (Share and
Import move the page's layout only), and a view that carries its cells'
other settings. Promoting a user view to prebuilt in one click (today: Share, turn the
overlay off, Import).

## Tested

`e2e/features/page-views.feature`; `trees.test.ts` (the five tree
functions); `page-views.test.ts` (the list, the names, the file);
`use-page-views.test.tsx` (the hook); `use-page-editing.test.tsx` (the
numbered copy); `page-views.test.tsx` and `page-views.stories.tsx` (the
component, in jsdom and in Edge).
