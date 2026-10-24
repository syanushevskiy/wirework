# Page views — the team's prebuilt layouts and the user's own, chosen from a list, shared as JSON

## Motivation

A page has one layout the team built, and every user may have rearranged it
for themselves — today into exactly one copy, named "my-own", with no way to
pick between layouts, keep several, or hand one to a colleague. A third
party embedding Wirework needs: the page's DEFAULT (admin) view plus any
number of prebuilt alternatives; any number of user views; one list to
choose from that says which is which; and a view as a JSON file a user can
save, send and import, with the application deciding where the files go.

Designed 2026-10-24 with the tiger team. Status: **built** (see "Tested").

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

## The tiger team's positions

- **Morgan (product):** a user picks a view in one click, sees at a glance
  whether it is the team's or their own, and shares one by pasting text to
  a colleague. Persistence across reloads is WW-19, not this story; the
  sharing must not wait for it.
- **Alexei (architecture):** no `kind` field in data — a kind derived from
  the tree cannot lie, and a file cannot claim to be prebuilt. One hook per
  component (`usePageViews` → `PageViews`), problems and locks as codes,
  words in the antd package. A versioned file with a kind marker, so a
  pasted recipe or a widget template is refused by shape, not by accident.
- **Dmitri (readability):** do not invent a `views` structure beside
  `templates`; use what resolve already reads. Keep "my-own" as the name of
  the first copy (the scenarios and the doc say it), number the next
  ("my-own-2"). No clipboard magic as the only path: the JSON is shown in a
  text box the user can read and paste from; Copy is a convenience.
- **Katya (team lead):** writes follow the EDIT TARGET the toolbar already
  shows — overlay on: Save as / Import make a user view; overlay off: a
  prebuilt one. One rule the team already knows. Choosing a view needs no
  permission (it is a preference); creating, renaming, deleting and
  importing need `editPages`, like Edit page. The host's `save` is the one
  persistence seam, unchanged.
- **Sasha (QA):** every control is a Gherkin step; the list's options carry
  the view's NAME as their title so a step picks by name; the shown view's
  kind is a `data-kind` fact; every refusal is text under one test id;
  import takes the JSON as a doc string. Pure tree functions and the file
  format are unit-tested; the hook with `renderHook`; the component has a
  story and a jsdom test.
- **Ren (contrarian):** three challenges, two accepted as limits, one
  turned into a rule. (1) A view carries the LAYOUT only: the per-cell
  settings overlay is keyed by page, not by view, so a shared view loses
  the author's widget tweaks — accepted for now, named below as the
  follow-up. (2) A shared file names the page's widgets and models; a page
  changed since shows those cells as problems — accepted: resolve already
  reports them loudly, nothing is dropped. (3) A user template with a base
  template's name SHADOWS it (`pageTemplates`: same name, user wins) — so
  a name a prebuilt view has is refused for a user view, and the other way
  round. Ren also asked for the admin side: without it "default (admin)
  template" is a fixture nobody can create — hence the target rule.
- **Vlad (fluency):** the list is one `flatMap` over the two trees; the
  checks of a name are one function returning the first problem.

Decision: build the above. Rejected: a per-view `cells` overlay (a schema
change through resolve, validation, the editor and every scenario, for a
secondary need); a `kind` field in the file; a modal dialog (the widget
editor set the precedent: a panel above the page, nothing floats over it).

## Where edits go (amends doc/layout-engines-design.md)

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

## Follow-up (not built)

A view that carries its cells' settings: the overlay's `cells` keyed by
view, or a view file that includes them and an import that merges them.
Promoting a user view to prebuilt in one click (today: Share, turn the
overlay off, Import).

## Tested

`e2e/features/page-views.feature`; `trees.test.ts` (the five tree
functions); `page-views.test.ts` (the list, the names, the file);
`use-page-views.test.tsx` (the hook); `use-page-editing.test.tsx` (the
numbered copy); `page-views.test.tsx` and `page-views.stories.tsx` (the
component, in jsdom and in Edge).
