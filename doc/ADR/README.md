# Architecture decision records

One record per decision that shapes Wirework. Every record says three
things: a DESCRIPTION of what was asked and what there was, the OPTIONS
CONSIDERED with what each costs, and the DECISION made. They are
numbered in the order they were decided and never renumbered; a decision
that is changed later is AMENDED in its own record (a dated section at its
end), and one that is replaced gets a new record that says which it
supersedes.

| ADR                                           | Decision                             | Date       | Status                                                            |
| --------------------------------------------- | ------------------------------------ | ---------- | ----------------------------------------------------------------- |
| [0001](0001-widget-io.md)                     | Widget IO                            | 2026-09-15 | Accepted — built                                                  |
| [0002](0002-widget-events.md)                 | Widget events                        | 2026-09-15 | Accepted — built                                                  |
| [0003](0003-layout-engines.md)                | Layout engines                       | 2026-09-15 | Accepted — built                                                  |
| [0004](0004-widget-contracts.md)              | Widget contracts                     | 2026-09-16 | Accepted — built                                                  |
| [0005](0005-actions.md)                       | Actions                              | 2026-09-16 | Accepted — partly built (phase 1; phases 4–7 designed 2026-10-14) |
| [0006](0006-page-views.md)                    | Page views                           | 2026-10-24 | Accepted — built                                                  |
| [0007](0007-row-window-and-header-filters.md) | Row window and shared header filters | 2026-10-24 | Accepted — built                                                  |
| [0008](0008-conditions.md)                    | Conditions                           | 2026-11-01 | Accepted — built                                                  |
| [0009](0009-containers.md)                    | Containers                           | 2026-11-02 | Accepted — built                                                  |
| [0010](0010-flex-rows.md)                     | Flex rows                            | 2026-11-03 | Accepted — built                                                  |
| [0011](0011-pages-as-code.md)                 | Pages as code                        | 2026-11-04 | Accepted — partly built (the file, Export page, the page folders) |
| [0012](0012-roles.md)                         | Roles                                | 2026-11-05 | Accepted — built                                                  |
| [0013](0013-css-grid.md)                      | CSS grid                             | 2026-11-07 | Accepted — built                                                  |
| [0014](0014-page-authoring-docs.md)           | Documentation for page authors       | 2026-11-07 | Proposed — not built                                              |
| [0015](0015-more-widgets.md)                  | More widgets on Ant Design           | 2026-11-09 | Accepted — built (the repeater still to be designed)              |
| [0016](0016-table-filters-and-cards.md)       | In-table filters and rows as cards   | 2026-11-09 | Accepted — partly built (the filter row; the cards not)           |
| [0017](0017-versioning-and-upgrades.md)       | Versions and upgrades                | 2026-11-14 | Accepted — the data format built; the release tooling not         |
| [0018](0018-lazy-widgets.md)                  | Lazy widgets                         | 2026-11-14 | Accepted — phase 1 built                                          |
| [0019](0019-security.md)                      | Security                             | 2026-11-14 | Proposed — a review of 0001–0018; nothing fixed                   |
| [0020](0020-row-actions.md)                   | Row actions                          | 2026-11-15 | Accepted — built                                                  |
| [0021](0021-table-height.md)                  | Table height                         | 2026-11-16 | Accepted — built for the infinite table (the plain table not)     |
| [0022](0022-filters-menu.md)                  | The table's filters behind a button  | 2026-11-16 | Proposed — not built                                              |

## Status

- **Proposed** — designed, waiting for the owner's decision; nothing built.
- **Accepted** — decided; the words after it say how much is built.
- **Superseded by ADR-NNNN** — replaced; kept for its reasons.

## Writing a new record

Name it `NNNN-short-title.md` with the next free number, kebab-case, no
dates in the name. Start from this:

```markdown
# ADR-NNNN: Title — the decision in a few words

- **Status:** Proposed — not built
- **Date:** YYYY-MM-DD
- **Deciders:** the product owner

## Description

What was asked for, in the asker's words, and what the code does today —
read from the code, with the facts measured.

## Options considered

Each option and what it costs.

## Decision

The option chosen and why, readable on its own.

## The design

## How it is tested

## Consequences

## Phases

## For the owner to decide
```

Add its line to the table above, and to the list of documents in CLAUDE.md.
