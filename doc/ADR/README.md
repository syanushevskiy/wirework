# Architecture decision records

One record per decision that shapes Wirework. Every record has the same
four sections: the DECISION in a few lines a reader can stop after, the
PROBLEM — what was asked and why —, the DETAILS of the decision as it
stands now, and the OPTIONS WEIGHED on the way to it.

A record says what IS. It carries no dates and no history: when a
decision changes, its record is rewritten to say the decision as it now
stands, and git keeps what it said before. Records are numbered in the
order they were decided and never renumbered; a decision that is replaced
gets a new record that says which it supersedes.

| ADR                                           | Decision                             | Status                                                              |
| --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| [0001](0001-widget-io.md)                     | Widget IO                            | Accepted — built                                                    |
| [0002](0002-widget-events.md)                 | Widget events                        | Accepted — built                                                    |
| [0003](0003-layout-engines.md)                | Layout engines                       | Accepted — built                                                    |
| [0004](0004-widget-contracts.md)              | Widget contracts                     | Accepted — built                                                    |
| [0005](0005-actions.md)                       | Actions                              | Accepted — partly built (phase 1; phases 4–7 designed)              |
| [0006](0006-page-views.md)                    | Page views                           | Accepted — built                                                    |
| [0007](0007-row-window-and-header-filters.md) | Row window and shared header filters | Accepted — built                                                    |
| [0008](0008-conditions.md)                    | Conditions                           | Accepted — built                                                    |
| [0009](0009-containers.md)                    | Containers                           | Accepted — built                                                    |
| [0010](0010-flex-rows.md)                     | Flex rows                            | Accepted — built                                                    |
| [0011](0011-pages-as-code.md)                 | Pages as code                        | Accepted — partly built (the file, Export and Import page, folders) |
| [0012](0012-roles.md)                         | Roles                                | Accepted — built                                                    |
| [0013](0013-css-grid.md)                      | CSS grid                             | Accepted — built                                                    |
| [0014](0014-page-authoring-docs.md)           | Documentation for page authors       | Proposed — not built                                                |
| [0015](0015-more-widgets.md)                  | More widgets on Ant Design           | Accepted — built (the repeater still to be designed)                |
| [0016](0016-table-filters-and-cards.md)       | In-table filters and rows as cards   | Accepted — partly built (the filter row; the cards not)             |
| [0017](0017-versioning-and-upgrades.md)       | Versions and upgrades                | Accepted — the data format built; the release tooling not           |
| [0018](0018-lazy-widgets.md)                  | Lazy widgets                         | Accepted — phase 1 built                                            |
| [0019](0019-security.md)                      | Security                             | Proposed — a review of 0001–0018; nothing fixed                     |
| [0020](0020-row-actions.md)                   | Row actions                          | Accepted — built                                                    |
| [0021](0021-table-height.md)                  | Table height                         | Accepted — built for the infinite table (the plain table not)       |
| [0022](0022-filters-menu.md)                  | The table's filters behind a button  | Proposed — not built                                                |
| [0023](0023-application-structure.md)         | The structure of an application      | Proposed — not built                                                |

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
- **Deciders:** the product owner

## 1. Decision

At most six lines a reader can stop after: what is decided (or
proposed) and how much of it is built.

## 2. Problem

What was asked for and why, and as much of what the code did before as
the decision needs. Short.

## 3. Details

The decision in full as it stands now, in the present tense, under plain topic
headings: the rules, the names (settings, ports, events, functions,
files), what is not built, how it is tested in one line, and last the
points still open for the owner.

## 4. Options weighed

Each option weighed, in a line or three, with why it was dropped or
chosen; the measurements and trade-offs that still explain the decision.
```

Rules for every record:

- These four sections and no other `##` heading.
- No dates, and no "amended", "built on", "it was … before": change the
  text to say what is true now.
- Say a thing once. Lists of e2e steps and of what the demo's pages show
  live in `CLAUDE.md`, not here.
- Keep a topic heading's words when you can — other files cite records by
  them (`ADR-0007 "The column menu"`).

Add the record's line to the table above, and to the list of documents in
CLAUDE.md.
