Feature: Table cells — links to the run and statuses as tags
  The runs table is described by the SERVER (columns from its metadata), yet
  the page decides how a column's cells LOOK: next to "hide this column" and
  "call it that" the page picks a cell kind per column, with no code —
  a LINK whose address pattern takes the row's own values ("/demo/runs/{id}"),
  or a TAG in a tone per value. Tones are colours by meaning: success is
  green, danger is red, info is blue, default is grey.

  A plain click on a link asks the page to go there (the table's
  `link-clicked` event, the page's `nav/follow` reaction); a click anywhere
  else on the row selects the row, as before. A cell only code can draw is
  a renderer the host registers by NAME — a page selects the name, and
  cannot change what it shows.

  Scenario: A run opens from its number
    Given I open the "runs" page
    Then the table row "123456" links "id" to "/demo/runs/123456"
    And the table row "123456" links "name" to "/demo/runs/123456"
    When I click the link "123456" in the table row "123456"
    Then the address is "/demo/runs/123456"
    And the "run" page is shown
    And the cell "label-run-name" reads "E2E Run # 98765"
    When I click the button "Back to runs"
    Then the address is "/demo/runs"

  Scenario: A run opens from its name
    Given I open the "runs" page
    When I click the link "Smoke suite" in the table row "123460"
    Then the address is "/demo/runs/123460"
    And the "run" page is shown
    And the cell "label-run-name" reads "Smoke suite"

  Scenario: Statuses are tags in a tone per state
    Given I open the "runs" page
    Then the table row "123456" shows a "danger" tag "Failed" for "state"
    And the table row "123457" shows a "success" tag "Success" for "state"
    And the table row "123458" shows a "info" tag "Running" for "state"
    And the table row "123460" shows a "danger" tag "Failed" for "state"
    # The text is still the text: the same step as for any cell.
    And the table row "123456" shows "Failed" for "state"

  Scenario: Clicking a row still selects it, next to the links
    Given I open the "runs" page
    When I click the table row "123456"
    Then the cell "echo-selected-run" reads 'Selected run:"123456"'
    And the address is "/demo/runs"

  Scenario: Following a link does not select the row, and a tag shows the default tone for an unlisted value
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the "input" port "rows" to "sample.rows"
    And I set the "input" port "columns" to "sample.columns"
    And I set the reaction for "row-selected" to set "sample.picked"
    And I set the reaction for "link-clicked" to set "sample.followed" from "href"
    And I add the widget
    And the store holds at "sample.columns":
      """
      [
        { "title": "Run", "property": "name", "cell": { "kind": "link", "to": "/demo/runs/{id}" } },
        { "title": "Status", "property": "state", "cell": { "kind": "tag", "tones": { "Failed": "danger" } } }
      ]
      """
    And the store holds at "sample.rows":
      """
      [
        { "id": "1", "name": "Nightly", "state": "Queued" },
        { "id": "2", "name": "Smoke", "state": "Failed" }
      ]
      """
    Then the table row "1" links "name" to "/demo/runs/1"
    And the table row "1" shows a "default" tag "Queued" for "state"
    And the table row "2" shows a "danger" tag "Failed" for "state"
    When I click the link "Smoke" in the table row "2"
    Then the state JSON contains '"followed": "/demo/runs/2"'
    And the state JSON does not contain '"picked"'
    When I click the table row "2"
    Then the state JSON contains '"picked": "2"'

  Scenario: A cell the host renders by name, and a name nobody registered
    Given I open the "builder" page
    When I choose the "antd-table" widget
    And I set the reaction for "load" to call "table-view/load"
    And I set the action parameter "url" for "load" to "/api/v1/view/runs"
    And I set the action parameter "into" for "load" to "builder.table"
    And I set the action parameter "pageSize" for "load" to "5"
    And I set the action parameter "columns" for "load" to '{ "state": { "cell": { "kind": "custom", "name": "run-status" } }, "reference": { "cell": { "kind": "custom", "name": "no-such-renderer" } } }'
    And I add the widget
    # "run-status" is this playground's own renderer: the state as a tag, the run's message behind it.
    Then the table row "123456" shows the host's status "Failed" with the message "ERROR ..."
    And the table row "123457" shows the host's status "Success" with the message "Finished"
    # A name nobody registered shows the value as text — never an empty cell.
    And the table row "123458" shows "REF59456737" for "reference" as plain text, no renderer having that name
